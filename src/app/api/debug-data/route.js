import { NextResponse } from 'next/server';
import { ProcessModel } from '@/app/api/processes/model';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await ProcessModel.findAll({});
  return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      count: data.length,
      sample: data[0]
  });
}
