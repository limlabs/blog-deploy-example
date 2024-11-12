import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as random from "@pulumi/random";

const stack = pulumi.getStack();

const mediaBucket = new aws.s3.BucketV2("mediaBucket", {
  bucketPrefix: pulumi.interpolate`blog-${stack}-media`, 
});

const mediaBucketOwnershipControls = new aws.s3.BucketOwnershipControls("media", {
  bucket: mediaBucket.id,
  rule: {
      objectOwnership: "BucketOwnerPreferred",
  },
});
const mediaBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("media", {
  bucket: mediaBucket.id,
  blockPublicAcls: false,
  blockPublicPolicy: false,
  ignorePublicAcls: false,
  restrictPublicBuckets: false,
});
new aws.s3.BucketAclV2("media", {
  bucket: mediaBucket.id,
  acl: "public-read",
}, {
  dependsOn: [
      mediaBucketOwnershipControls,
      mediaBucketPublicAccessBlock,
  ],
});

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
  skipFinalSnapshot: true,
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
  namePrefix: pulumi.interpolate`blog-${stack}-connectionString-`
});

new aws.secretsmanager.SecretVersion("connectionStringVersion", {
  secretId: connectionStringSecret.id,
  secretString: postgresPrismaURL,
});

const repo = new awsx.ecr.Repository("repo", {
  name: pulumi.interpolate`blog-${stack}`,
  forceDelete: true,
});

const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
  name: pulumi.interpolate`blog-${stack}-lb`,
  defaultTargetGroup: {
    name: pulumi.interpolate`blog-${stack}-tg`,
    port: 3000,
    targetType: "ip",
    deregistrationDelay: 10,
    healthCheck: {
      enabled: true,
    }
  },
  listener: {
    port: 80,
  },
});

new aws.s3.BucketCorsConfigurationV2("media", {
  bucket: mediaBucket.id,
  corsRules: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "PUT", "POST", "DELETE"],
      allowedOrigins: [pulumi.interpolate`http://${lb.loadBalancer.dnsName}`],
      maxAgeSeconds: 3000,
    }
  ],
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

const executionRolePolicy = new aws.iam.RolePolicy("ExecutionRolePolicy", {
  role: executionRole,
  name: pulumi.interpolate`blog-${stack}-app-execution-role-policy`,
  policy: connectionStringSecret.arn.apply(arn => JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "secretsmanager:GetSecretValue",
        Effect: "Allow",
        Resource: [arn],
      },
    ],
  })),
});

const taskRole = new aws.iam.Role("AppTaskRole", {
  name: pulumi.interpolate`blog-${stack}-app-task-role`,
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

new aws.iam.RolePolicy("TaskRolePolicy", {
  name: pulumi.interpolate`blog-${stack}-app-task-role-policy`,
  role: taskRole,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: [
          "s3:PutObject",
          "s3:PutObjectAcl",
        ],
        Effect: "Allow",
        Resource: [pulumi.interpolate`${mediaBucket.arn}/*`],
      }
    ],
  }
});

const image = new awsx.ecr.Image("image", {
  repositoryUrl: repo.url,
  context: "..",
  platform: "linux/amd64"
});

new awsx.ecs.FargateService("service", {
  name: pulumi.interpolate`blog-${stack}-app`,
  cluster: cluster.arn,
  assignPublicIp: true,
  loadBalancers: [{
    containerName: "blog",
    containerPort: 3000,
    targetGroupArn: lb.defaultTargetGroup.arn,
  }],
  taskDefinitionArgs: {
    taskRole: {
      roleArn: taskRole.arn,
    },
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
      environment: [
        {
          name: "MEDIA_BUCKET_NAME",
          value: mediaBucket.bucket,
        },
      ],
      secrets: [
        {
          name: "POSTGRES_PRISMA_URL",
          valueFrom: connectionStringSecret.arn,
        }
      ]
    },
  },
}, {
  dependsOn: [executionRolePolicy, executionRolePolicyAttachment, database],
});


export const appURL = pulumi.interpolate`http://${lb.loadBalancer.dnsName}`;
export const connectionStringArn = connectionStringSecret.arn;
export const dbEndpoint = database.endpoint;
export const mediaBucketName = mediaBucket.bucket;
