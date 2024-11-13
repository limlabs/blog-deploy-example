import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as random from "@pulumi/random";

const stack = pulumi.getStack();

const suffix = new random.RandomString("suffix", {
  length: 6,
  special: false,
});

const vpc = new awsx.ec2.Vpc(`blog-${stack}-vpc`, {
  enableDnsHostnames: true,
  enableDnsSupport: true,
  cidrBlock: "10.0.0.0/16",
  natGateways: {
    strategy: "None",
  },
  subnetStrategy: "Auto",
  subnetSpecs: [
    {
      type: "Public",
      cidrMask: 20,
    },
  ],
});

const mediaBucket = new aws.s3.BucketV2("mediaBucket", {
  bucketPrefix: pulumi.interpolate`blog-${stack}-media`,
});

const dbPassword = new random.RandomPassword("dbPassword", {
  length: 24,
  special: false,
});

const dbIngressSecruityGroup = new aws.ec2.SecurityGroup("DBIngressSecurityGroup", {
  vpcId: vpc.vpcId,
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

const publicSubnetGroup = new aws.rds.SubnetGroup("publicSubnetGroup", {
  name: pulumi.interpolate`blog-${stack}-public-subnet-group`,
  subnetIds: vpc.publicSubnetIds,
});

const dbCluster = new aws.rds.Cluster("BlogDBCluster", {
  clusterIdentifier: pulumi.interpolate`blog-${stack}-db-cluster`,
  engine: aws.rds.EngineType.AuroraPostgresql,
  databaseName: "blog",
  masterUsername: "postgres",
  masterPassword: dbPassword.result,
  dbSubnetGroupName: publicSubnetGroup.name,
  vpcSecurityGroupIds: [dbIngressSecruityGroup.id.apply(id => id)],
  skipFinalSnapshot: true,
});

const database = new aws.rds.ClusterInstance("BlogDBInstance", {
  dbSubnetGroupName: publicSubnetGroup.name,
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

const publicIngressSecurityGroup = new aws.ec2.SecurityGroup("PublicIngressSecurityGroup", {
  vpcId: vpc.vpcId,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
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


const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
  name: pulumi.interpolate`blog-${stack}-lb`,
  securityGroups: [publicIngressSecurityGroup.id.apply(id => id)],
  subnetIds: vpc.publicSubnetIds,
  defaultTargetGroup: {
    vpcId: vpc.vpcId,
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

const oai = new aws.cloudfront.OriginAccessIdentity(`blog-${stack}-${suffix}`, {
  comment: "OAI for CloudFront distribution to access S3 bucket",
});

new aws.s3.BucketPolicy("mediaBucketPolicy", {
  bucket: mediaBucket.id,
  policy: pulumi.all([mediaBucket.arn, oai.iamArn]).apply(([mediaArn, iamArn]) => JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: iamArn,
        },
        Action: ["s3:GetObject"],
        Resource: `${mediaArn}/*`,
      },
    ],
  })),
});


const distribution = new aws.cloudfront.Distribution(`blog-${stack}-distribution`, {
  enabled: true,
  origins: [
    {
      domainName: lb.loadBalancer.dnsName,
      originId: `blog-${stack}-origin`,
      customOriginConfig: {
        originProtocolPolicy: "http-only",  // Ensures CloudFront communicates with ALB over HTTPS
        httpPort: 80,
        httpsPort: 443,
        originSslProtocols: ["TLSv1.2"],
      },
    },
    {
      domainName: mediaBucket.bucketRegionalDomainName,
      originId: `blog-${stack}-media-origin`,
      s3OriginConfig: {
        originAccessIdentity: oai.cloudfrontAccessIdentityPath,  // Restrict access to the bucket
      },
    }
  ],
  orderedCacheBehaviors: [
    {
      pathPattern: "/media/*",
      targetOriginId: `blog-${stack}-media-origin`,
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      
      viewerProtocolPolicy: "redirect-to-https",
      forwardedValues: {
        headers: [],
        queryStringCacheKeys: [],
        queryString: false,
        cookies: {
          forward: "none"
        },
      },
    }
  ],
  defaultCacheBehavior: {
    targetOriginId: `blog-${stack}-origin`,
    viewerProtocolPolicy: "redirect-to-https",  // Redirects all traffic to HTTPS
    allowedMethods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
    cachedMethods: ["GET", "HEAD"],
    compress: true,
    forwardedValues: {
      queryString: true,
      headers: ["*"],
      cookies: {
        forward: "all"
      }
    },
  },
  priceClass: "PriceClass_100",  // Adjust based on your preferred CloudFront regions
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,  // Use the default CloudFront certificate for SSL
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
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
  args: {
    INPUT_CDN_URL: pulumi.interpolate`https://${distribution.domainName}`,
  },
  platform: "linux/amd64"
});

const appSecurityGroup = new aws.ec2.SecurityGroup("AppSecurityGroup", {
  vpcId: vpc.vpcId,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 3000,
      toPort: 3000,
      securityGroups: [publicIngressSecurityGroup.id.apply(id => id)],
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

new awsx.ecs.FargateService("service", {
  name: pulumi.interpolate`blog-${stack}-app`,
  cluster: cluster.arn,
  networkConfiguration: {
    subnets: vpc.publicSubnetIds,
    assignPublicIp: true,
    securityGroups: [appSecurityGroup.id.apply(id => id)],
  },
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
        {
          name: "CDN_URL",
          value: pulumi.interpolate`https://${distribution.domainName}`,
        }
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


export const appURL = pulumi.interpolate`https://${distribution.domainName}`;
export const connectionStringArn = connectionStringSecret.arn;
export const dbEndpoint = database.endpoint;
export const mediaBucketName = mediaBucket.bucket;
