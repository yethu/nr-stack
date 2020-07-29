# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Directions
- GitHub owner and repo can be set in `/bin/nr.ts`
- the service runs at the application loadbalancer's port `1880`

## Notes
- this solution uses a dummy image to solve cyclic dependency between Fargate service's `taskImageOptions` and CodePipeline's Deploy stage.