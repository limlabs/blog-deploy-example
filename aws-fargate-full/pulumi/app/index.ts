import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const stack = pulumi.getStack();
const foundationStack = config.require("foundationStack");

const stackRef = new pulumi.StackReference(`organization/blog-aws-fargate/${foundationStack}`)

const connectionStringArn = stackRef.requireOutput("connectionStringArn");
const repoUrl = stackRef.requireOutput("ecrRepoUrl");
const clusterArn = stackRef.requireOutput("clusterArn");
const listenerArn = stackRef.requireOutput("listenerArn");
const lbVpcId = stackRef.requireOutput("lbVpcId");
const appSecurityGroupId = stackRef.requireOutput("appSecurityGroupId");
const privateSubnetIds = stackRef.requireOutput("privateSubnetIds");

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
  listenerArn: listenerArn,
  ...(priority > -1) && { priority },
});


const executionRole = new aws.iam.Role("AppExecutionRole", {
  name: pulumi.interpolate`blog-${stack}-app-execution-role`,
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
      },
    ],
  }),
});

const executionRolePolicyAttachment = new aws.iam.PolicyAttachment("ApExecutionRoleAttachment", {
  policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  roles: [executionRole],
});

const executionRolePolicy = new aws.iam.RolePolicy("ExeuctionRolePolicy", {
  role: executionRole,
  name: pulumi.interpolate`blog-${stack}-app-execution-role-policy`,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "secretsmanager:GetSecretValue",
        Effect: "Allow",
        Resource: "*",
      },
    ],
  }),
});

new awsx.ecs.FargateService("service", {
  name: pulumi.interpolate`blog-app-${stack}`,
  cluster: clusterArn,
  networkConfiguration: {
    subnets: privateSubnetIds,
    securityGroups: [appSecurityGroupId],
  },
  taskDefinitionArgs: {
    executionRole: {
      roleArn: executionRole.arn,
    },
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
}, {
  dependsOn: [executionRolePolicy, executionRolePolicyAttachment]
});
