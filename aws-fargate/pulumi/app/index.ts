import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const stack = pulumi.getStack();
const org = config.require("org");
const foundationStack = config.require("foundationStack");

const stackRef = new pulumi.StackReference(`${org}/foundation/${foundationStack}`)

const connectionStringArn = stackRef.getOutput("connectionStringArn");
const repoUrl = stackRef.getOutput("ecrRepoUrl");
const clusterArn = stackRef.getOutput("clusterArn");
const lbArn = stackRef.getOutput("lbArn");
const lbVpcId = stackRef.getOutput("lbVpcId");
const appSecurityGroupId = stackRef.getOutput("appSecurityGroupId");
const appSubnetIds = stackRef.getOutput("publicSubnetIds");

const image = new awsx.ecr.Image("image", {
  repositoryUrl: repoUrl,
  context: "../..",
  platform: "linux/amd64",
});

const targetGroup = new aws.lb.TargetGroup("targetGroup", {
  port: 3000,
  protocol: "HTTP",
  targetType: "ip",
  vpcId: lbVpcId,
});

let conditions: pulumi.Input<pulumi.Input<aws.types.input.lb.ListenerRuleCondition>[]> = [];
let priority = -1;
if (stack === "prod") {
  priority = 1;
  conditions = [
    {
      pathPattern: {
        values: ["*"],
      },
    },
  ];
} else {
  conditions = [{
    queryStrings: [
      {
        key: "stack",
        value: stack
      }
    ],
  }]
}

new aws.lb.ListenerRule("listenerRule", {
  actions: [{
    type: "forward",
    targetGroupArn: targetGroup.arn,
  }],
  conditions,
  listenerArn: lbArn,
  ...(priority > -1) && { priority },
});

const appRole = new aws.iam.Role("AppRole", {
  name: "app-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Effect: "Allow",
      Sid: "",
      Principal: {
        Service: "ecs.amazonaws.com",
      },
    }],
  }),
});

new aws.iam.RolePolicy("AppRolePolicy", {
  role: appRole,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "secretsmanager:GetSecretValue",
        Effect: "Allow",
        Resource: connectionStringArn,
      },
    ],
  }),
});


new awsx.ecs.FargateService("service", {
  cluster: clusterArn,
  assignPublicIp: false,
  networkConfiguration: {
    subnets: appSubnetIds,
    securityGroups: [appSecurityGroupId],
  },
  taskDefinitionArgs: {
    container: {
      name: "blog",
      image: image.imageUri,
      cpu: 256,
      memory: 512,
      essential: true,
      portMappings: [
        {
          containerPort: 3000,
          targetGroup: targetGroup,
        },
      ],
      secrets: [
        {
          name: "POSTGRES_PRISMA_URL",
          valueFrom: connectionStringArn,
        }
      ]
    },
  },
});
