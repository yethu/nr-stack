#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NrStack } from '../lib/nr-stack';

const app = new cdk.App();
new NrStack(app, 'NrStack');
