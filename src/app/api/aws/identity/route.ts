import { NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

export async function GET() {
  try {
    const client = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const command = new GetCallerIdentityCommand({})
    const response = await client.send(command)
    return NextResponse.json({
      success: true,
      UserId: response.UserId,
      Account: response.Account,
      Arn: response.Arn,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get AWS identity',
    })
  }
}
