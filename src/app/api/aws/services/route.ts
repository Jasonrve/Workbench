import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager'
import { SSMClient, DescribeParametersCommand } from '@aws-sdk/client-ssm'
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr'

export async function POST(request: NextRequest) {
  try {
    const { service } = await request.json()
    const region = process.env.AWS_REGION || 'us-east-1'
    const start = Date.now()

    let result: Record<string, unknown> = {}

    try {
      switch (service) {
        case 's3': {
          const client = new S3Client({ region })
          const cmd = new ListBucketsCommand({})
          const res = await client.send(cmd)
          result = { success: true, count: res.Buckets?.length ?? 0 }
          break
        }
        case 'dynamodb': {
          const client = new DynamoDBClient({ region })
          const cmd = new ListTablesCommand({ Limit: 1 })
          await client.send(cmd)
          result = { success: true }
          break
        }
        case 'secretsmanager': {
          const client = new SecretsManagerClient({ region })
          const cmd = new ListSecretsCommand({ MaxResults: 1 })
          await client.send(cmd)
          result = { success: true }
          break
        }
        case 'ssm': {
          const client = new SSMClient({ region })
          const cmd = new DescribeParametersCommand({ MaxResults: 1 })
          await client.send(cmd)
          result = { success: true }
          break
        }
        case 'ecr': {
          const client = new ECRClient({ region })
          const cmd = new DescribeRepositoriesCommand({ maxResults: 1 })
          await client.send(cmd)
          result = { success: true }
          break
        }
        case 'sts': {
          const client = new STSClient({ region })
          const cmd = new GetCallerIdentityCommand({})
          const res = await client.send(cmd)
          result = { success: true, account: res.Account }
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
