import { Storage } from 'megajs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { fileData, fileName } = await req.json();

    if (!fileData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const email = process.env.MEGA_EMAIL;
    const password = process.env.MEGA_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: 'MEGA credentials are not configured on the server.' }, { status: 500 });
    }

    const buffer = Buffer.from(fileData, 'base64');
    
    // Disable keepalive as it can cause lambda/serverless function timeouts
    const storage = await new Storage({ email, password, keepalive: false }).ready;
    
    const file = await storage.upload({
      name: fileName || 'animation.gif',
      size: buffer.length
    }, buffer).complete;

    const link = await file.link(true);

    return NextResponse.json({ link });
  } catch (error: any) {
    console.error('Mega Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload to MEGA' }, { status: 500 });
  }
}
