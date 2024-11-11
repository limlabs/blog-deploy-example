import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const init = config.getBoolean("init") || false;

const stack = pulumi.getStack();


const dbPassword = new random.RandomPassword("dbPassword", {
  length: 24,
  special: false,
});

const dbIngressSecruityGroup = new aws.ec2.SecurityGroup("DBIngressSecurityGroup", {
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: ["0.0.0.0/0"],
    }
  ],
  egress: [
    {
      protocol: "tcp",
      fromPort: 0,
      toPort: 65535,
      cidrBlocks: ["0.0.0.0/0"],
    }
  ],
});

const dbCluster = new aws.rds.Cluster("BlogDBCluster", {
  clusterIdentifier: pulumi.interpolate`blog-${stack}-db-cluster`,
  engine: aws.rds.EngineType.AuroraPostgresql,
  databaseName: "blog",
  masterUsername: "postgres",
  masterPassword: dbPassword.result,
  vpcSecurityGroupIds: [dbIngressSecruityGroup.id],
});

const database = new aws.rds.ClusterInstance("BlogDBInstance", {
  clusterIdentifier: dbCluster.id,
  engine: aws.rds.EngineType.AuroraPostgresql,
  publiclyAccessible: true,
  instanceClass: "db.t3.medium",
  identifier: pulumi.interpolate`blog-${stack}-db-instance`,
});

const postgresPrismaURL = pulumi.interpolate`postgresql://${dbCluster.masterUsername}:${dbPassword.result}@${database.endpoint}:${database.port}/${dbCluster.databaseName}`

const connectionStringSecret = new aws.secretsmanager.Secret("connectionString", {
  name: pulumi.interpolate`blog/foundation/${stack}/connectionString`
});

new aws.secretsmanager.SecretVersion("connectionStringVersion", {
  secretId: connectionStringSecret.id,
  secretString: postgresPrismaURL,
});

const repo = new awsx.ecr.Repository("repo", {
  forceDelete: true,
});

const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
  name: pulumi.interpolate`blog-foundation-${stack}-lb`,
  listener: {
    port: 80,
  },
});

const cluster = new aws.ecs.Cluster("cluster", {
  name: pulumi.interpolate`blog-${stack}`
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

if (!init) {
  const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.url,
    context: "..",
    platform: "linux/amd64",
  });
  
  new awsx.ecs.FargateService("service", {
    name: pulumi.interpolate`blog-app-${stack}`,
    cluster: cluster.arn,
    assignPublicIp: true,
    loadBalancers: [{
      containerName: "blog",
      containerPort: 3000,
      targetGroupArn: lb.defaultTargetGroup.arn,
    }],
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
        portMappings: [{
          hostPort: 3000,
          containerPort: 3000,
        }],
        secrets: [
          {
            name: "POSTGRES_PRISMA_URL",
            valueFrom: connectionStringSecret.arn,
          }
        ]
      },
    },
  }, {
    dependsOn: [executionRolePolicy, executionRolePolicyAttachment, lb]
  });

}

export const appURL = pulumi.interpolate`http://${lb.loadBalancer.dnsName}`;
export const connectionStringArn = connectionStringSecret.arn;
export const dbEndpoint = database.endpoint;