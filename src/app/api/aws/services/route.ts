import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand, GetSessionTokenCommand } from '@aws-sdk/client-sts'
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetBucketLocationCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb'
import {
  SecretsManagerClient,
  ListSecretsCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'
import {
  SSMClient,
  DescribeParametersCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
} from '@aws-sdk/client-ssm'
import {
  ECRClient,
  DescribeRepositoriesCommand,
  ListImagesCommand,
  GetAuthorizationTokenCommand,
} from '@aws-sdk/client-ecr'

/** Extract a human-readable name from an ARN or return it as-is for non-ARN identifiers. */
function parseArnResource(arn: string): string {
  if (!arn.startsWith('arn:')) return arn
  // arn:aws:service:region:account:resourcetype/resource or resourcetype:resource
  const parts = arn.split(':')
  const resourcePart = parts.slice(5).join(':')
  // Handle resource/name or resource:name
  const slashIndex = resourcePart.indexOf('/')
  return slashIndex >= 0 ? resourcePart.slice(slashIndex + 1) : resourcePart
}

export async function POST(request: NextRequest) {
  try {
    const { service, action, arn } = await request.json()
    const region = process.env.AWS_REGION || 'us-east-1'
    const start = Date.now()

    let result: Record<string, unknown> = {}

    try {
      switch (service) {
        case 's3': {
          const client = new S3Client({ region })
          const bucketName = arn ? parseArnResource(arn) : undefined
          switch (action || 'ListBuckets') {
            case 'ListBuckets': {
              const res = await client.send(new ListBucketsCommand({}))
              result = {
                success: true,
                data: res.Buckets?.map((b) => ({ name: b.Name, created: b.CreationDate })),
              }
              break
            }
            case 'ListObjects': {
              if (!bucketName) return NextResponse.json({ success: false, error: 'Bucket name or ARN is required' })
              const res = await client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 50 }))
              result = {
                success: true,
                data: res.Contents?.map((o) => ({ key: o.Key, size: o.Size, modified: o.LastModified })),
                count: res.KeyCount,
              }
              break
            }
            case 'GetBucketLocation': {
              if (!bucketName) return NextResponse.json({ success: false, error: 'Bucket name or ARN is required' })
              const res = await client.send(new GetBucketLocationCommand({ Bucket: bucketName }))
              result = { success: true, data: { location: res.LocationConstraint || 'us-east-1' } }
              break
            }
            case 'HeadBucket': {
              if (!bucketName) return NextResponse.json({ success: false, error: 'Bucket name or ARN is required' })
              await client.send(new HeadBucketCommand({ Bucket: bucketName }))
              result = { success: true, data: { exists: true, bucket: bucketName } }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown S3 action: ${action}` })
          }
          break
        }

        case 'dynamodb': {
          const client = new DynamoDBClient({ region })
          const tableName = arn ? parseArnResource(arn) : undefined
          switch (action || 'ListTables') {
            case 'ListTables': {
              const res = await client.send(new ListTablesCommand({ Limit: 50 }))
              result = { success: true, data: res.TableNames }
              break
            }
            case 'DescribeTable': {
              if (!tableName) return NextResponse.json({ success: false, error: 'Table name or ARN is required' })
              const res = await client.send(new DescribeTableCommand({ TableName: tableName }))
              result = {
                success: true,
                data: {
                  name: res.Table?.TableName,
                  status: res.Table?.TableStatus,
                  itemCount: res.Table?.ItemCount,
                  sizeBytes: res.Table?.TableSizeBytes,
                  keySchema: res.Table?.KeySchema,
                },
              }
              break
            }
            case 'Scan': {
              if (!tableName) return NextResponse.json({ success: false, error: 'Table name or ARN is required' })
              const res = await client.send(new ScanCommand({ TableName: tableName, Limit: 10 }))
              result = { success: true, data: res.Items, count: res.Count, scannedCount: res.ScannedCount }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown DynamoDB action: ${action}` })
          }
          break
        }

        case 'secretsmanager': {
          const client = new SecretsManagerClient({ region })
          switch (action || 'ListSecrets') {
            case 'ListSecrets': {
              const res = await client.send(new ListSecretsCommand({ MaxResults: 50 }))
              result = {
                success: true,
                data: res.SecretList?.map((s) => ({ name: s.Name, arn: s.ARN, lastChanged: s.LastChangedDate })),
              }
              break
            }
            case 'DescribeSecret': {
              if (!arn) return NextResponse.json({ success: false, error: 'Secret name or ARN is required' })
              const res = await client.send(new DescribeSecretCommand({ SecretId: arn }))
              result = {
                success: true,
                data: {
                  name: res.Name,
                  arn: res.ARN,
                  description: res.Description,
                  lastChanged: res.LastChangedDate,
                  rotationEnabled: res.RotationEnabled,
                  tags: res.Tags,
                },
              }
              break
            }
            case 'GetSecretValue': {
              if (!arn) return NextResponse.json({ success: false, error: 'Secret name or ARN is required' })
              const res = await client.send(new GetSecretValueCommand({ SecretId: arn }))
              result = {
                success: true,
                data: {
                  name: res.Name,
                  versionId: res.VersionId,
                  secretString: res.SecretString ? '[REDACTED - value retrieved successfully]' : undefined,
                  secretBinary: res.SecretBinary ? '[BINARY - retrieved successfully]' : undefined,
                },
              }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown SecretsManager action: ${action}` })
          }
          break
        }

        case 'ssm': {
          const client = new SSMClient({ region })
          switch (action || 'DescribeParameters') {
            case 'DescribeParameters': {
              const res = await client.send(new DescribeParametersCommand({ MaxResults: 50 }))
              result = {
                success: true,
                data: res.Parameters?.map((p) => ({ name: p.Name, type: p.Type, lastModified: p.LastModifiedDate })),
              }
              break
            }
            case 'GetParameter': {
              if (!arn) return NextResponse.json({ success: false, error: 'Parameter name or ARN is required' })
              const paramName = arn.startsWith('arn:') ? parseArnResource(arn) : arn
              const res = await client.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }))
              result = {
                success: true,
                data: {
                  name: res.Parameter?.Name,
                  type: res.Parameter?.Type,
                  value: res.Parameter?.Type === 'SecureString'
                    ? '[REDACTED - value retrieved successfully]'
                    : res.Parameter?.Value,
                  version: res.Parameter?.Version,
                  lastModified: res.Parameter?.LastModifiedDate,
                },
              }
              break
            }
            case 'GetParametersByPath': {
              if (!arn) return NextResponse.json({ success: false, error: 'Path is required (e.g. /my/path/)' })
              const res = await client.send(
                new GetParametersByPathCommand({ Path: arn, MaxResults: 10, Recursive: true, WithDecryption: false })
              )
              result = {
                success: true,
                data: res.Parameters?.map((p) => ({
                  name: p.Name,
                  type: p.Type,
                  value: p.Type === 'SecureString' ? '[REDACTED]' : p.Value,
                })),
              }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown SSM action: ${action}` })
          }
          break
        }

        case 'sts': {
          const client = new STSClient({ region })
          switch (action || 'GetCallerIdentity') {
            case 'GetCallerIdentity': {
              const res = await client.send(new GetCallerIdentityCommand({}))
              result = { success: true, data: { account: res.Account, arn: res.Arn, userId: res.UserId } }
              break
            }
            case 'GetSessionToken': {
              const res = await client.send(new GetSessionTokenCommand({ DurationSeconds: 900 }))
              result = {
                success: true,
                data: {
                  accessKeyId: res.Credentials?.AccessKeyId ? '****' + res.Credentials.AccessKeyId.slice(-4) : undefined,
                  expiration: res.Credentials?.Expiration,
                },
              }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown STS action: ${action}` })
          }
          break
        }

        case 'ecr': {
          const client = new ECRClient({ region })
          const repoName = arn ? parseArnResource(arn) : undefined
          switch (action || 'DescribeRepositories') {
            case 'DescribeRepositories': {
              const res = await client.send(new DescribeRepositoriesCommand({ maxResults: 50 }))
              result = {
                success: true,
                data: res.repositories?.map((r) => ({
                  name: r.repositoryName,
                  uri: r.repositoryUri,
                  createdAt: r.createdAt,
                  imageCount: r.imageTagMutability,
                })),
              }
              break
            }
            case 'ListImages': {
              if (!repoName) return NextResponse.json({ success: false, error: 'Repository name or ARN is required' })
              const res = await client.send(new ListImagesCommand({ repositoryName: repoName, maxResults: 50 }))
              result = {
                success: true,
                data: res.imageIds?.map((img) => ({ tag: img.imageTag, digest: img.imageDigest })),
              }
              break
            }
            case 'GetAuthorizationToken': {
              const res = await client.send(new GetAuthorizationTokenCommand({}))
              result = {
                success: true,
                data: res.authorizationData?.map((a) => ({
                  proxyEndpoint: a.proxyEndpoint,
                  expiresAt: a.expiresAt,
                  token: '[REDACTED]',
                })),
              }
              break
            }
            default:
              return NextResponse.json({ success: false, error: `Unknown ECR action: ${action}` })
          }
          break
        }

        default:
          return NextResponse.json({ success: false, error: `Unknown service: ${service}` })
      }
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : 'Service call failed',
        latency: Date.now() - start,
      })
    }

    return NextResponse.json({ ...result, latency: Date.now() - start })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    })
  }
}
