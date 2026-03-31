import { NextRequest, NextResponse } from 'next/server'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'

export async function POST(request: NextRequest) {
  try {
    const { roleArn, externalId, sessionName } = await request.json()
    if (!roleArn) {
      return NextResponse.json({ success: false, error: 'roleArn is required' })
    }
    const client = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName || 'k8s-debugger-session',
      ExternalId: externalId || undefined,
      DurationSeconds: 900,
    })
    const response = await client.send(command)
    return NextResponse.json({
      success: true,
      AssumedRoleUser: response.AssumedRoleUser,
      credentials: {
        accessKeyId: response.Credentials?.AccessKeyId?.substring(0, 4) + '****',
        expiration: response.Credentials?.Expiration,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assume role',
    })
  }
}
