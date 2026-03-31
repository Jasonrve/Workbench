import { NextRequest, NextResponse } from 'next/server'
import { Route53Client, ListHostedZonesCommand, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53'

export async function POST(request: NextRequest) {
  try {
    const { hostedZoneId, recordName, recordType } = await request.json()
    const client = new Route53Client({ region: process.env.AWS_REGION || 'us-east-1' })

    if (!hostedZoneId) {
      // List all hosted zones
      const cmd = new ListHostedZonesCommand({})
      const res = await client.send(cmd)
      return NextResponse.json({
        success: true,
        hostedZones: res.HostedZones?.map(hz => ({
          id: hz.Id,
          name: hz.Name,
          recordCount: hz.ResourceRecordSetCount,
          private: hz.Config?.PrivateZone,
        })),
      })
    }

    // List record sets for the hosted zone
    const cmd = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      StartRecordName: recordName || undefined,
      StartRecordType: recordType || undefined,
      MaxItems: 50,
    })
    const res = await client.send(cmd)

    return NextResponse.json({
      success: true,
      records: res.ResourceRecordSets?.map(rrs => ({
        name: rrs.Name,
        type: rrs.Type,
        ttl: rrs.TTL,
        values: rrs.ResourceRecords?.map(r => r.Value),
        aliasTarget: rrs.AliasTarget?.DNSName,
      })),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Route53 query failed',
    })
  }
}
