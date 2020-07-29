import * as cdk from '@aws-cdk/core';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { BuildSpec, PipelineProject } from '@aws-cdk/aws-codebuild';
import { Cluster, ClusterProps, ContainerImage } from '@aws-cdk/aws-ecs';
import { CodeBuildAction, CodeCommitSourceAction, CodeCommitTrigger, EcsDeployAction, GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Repository } from '@aws-cdk/aws-ecr';
import { Repository as CCRepository} from '@aws-cdk/aws-codecommit';
import { SecretValue } from '@aws-cdk/core';

interface NRStackProps extends cdk.StackProps {
  owner: string,
  repo: string,
}

export class NrStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: NRStackProps) {
    super(scope, id, props);

    let repository: Repository = this.createRepo();
    let cluster: Cluster = this.createCluster();
    let codebuildProject = this.createCodeBuildProject(repository);
    let codepipleline = this.createCodePipeline();


    /** for github */
    // const oauth = SecretValue.secretsManager('oauth', {
    //   jsonField: 'oauth',
    // });

    let sourceOutput = new Artifact();

    /** for github */
    // let sourceAction = new GitHubSourceAction({
    //   actionName: 'GitHubSource',
    //   owner: props!.owner,
    //   repo: props!.repo,
    //   output: sourceOutput,
    //   branch: 'master',
    //   oauthToken: oauth,
    //   trigger: GitHubTrigger.WEBHOOK,
    // });

    let ccRepository = new CCRepository(this, 'DevOpsTest',{
      repositoryName: 'devops-test',
      description: 'Repository for NodeRed',
    });

    let sourceAction = new CodeCommitSourceAction({
      actionName: 'CodeCommitSource',
      output: sourceOutput,
      repository: CCRepository.fromRepositoryName(this, 'NRCodeCommit', 'devops-test'),
      trigger: CodeCommitTrigger.EVENTS,
      branch: 'master',
    });

    let buildArtifact = new Artifact();

    let buildAction = new CodeBuildAction({
      actionName: 'CodeBuild',
      project: codebuildProject,
      input: sourceOutput,
      outputs: [buildArtifact],
    });

    let service = new ApplicationLoadBalancedFargateService(this, 'NRFargateService', {
      cluster,
      assignPublicIp: true,
      taskImageOptions: {
        image: ContainerImage.fromRegistry('nodered/node-red'),
        containerName: 'nr',
        containerPort: 1880,
      },
      listenerPort: 1880,
    });

    let deployAction = new EcsDeployAction({
      actionName: 'NRECSDeployAction',
      input: buildArtifact,
      service: service.service,
    });

    codepipleline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    codepipleline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    codepipleline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });

    repository.grantPullPush(codepipleline.role);
    repository.grantPullPush(codebuildProject.role!);

    service.taskDefinition.executionRole?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser')
    );
  }

  createCodePipeline(): Pipeline {
    return new Pipeline(this, 'NRCodePipeline', {
      pipelineName: 'nr-pipeline',
    });
  }

  createCodeBuildProject(repository: Repository): PipelineProject {
    return new PipelineProject(this, 'NRCodeBuild', {
      projectName: 'nr',
      description: 'CodeBuild project for Node-RED',
      environment: {
        privileged: true,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              '$(aws ecr get-login --region ap-southeast-1 --no-include-email)',
              `REPOSITORY_URI=${repository.repositoryUri}`,
              `COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)`,
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'ls',
              'docker build -t $REPOSITORY_URI:latest .',
              `docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG`,
            ],
          },
          post_build: {
            commands: [
              'docker push $REPOSITORY_URI:latest',
              'docker push $REPOSITORY_URI:$IMAGE_TAG',
              'printf "[{\\"name\\":\\"nr\\",\\"imageUri\\":\\"${REPOSITORY_URI}:$IMAGE_TAG\\"}]" > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
    });
  }

  createRepo(): Repository {
    return new Repository(this, 'NRRepo', {
      repositoryName: 'nr'
    });
  }

  createCluster(): Cluster {
    let props: ClusterProps = {
      clusterName: 'nr-cluster',
      containerInsights: true,
    }

    return new Cluster(this, 'NRCluster', props);
  }
}