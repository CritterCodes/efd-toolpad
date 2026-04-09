import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import AdminSettingsService from "./service.js";

export default class AdminSettingsController {
  static async getSettings(request) {
    try {
      const session = await auth();
      
      if (!session || !session.user?.email?.includes('@')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const publicSettings = await AdminSettingsService.getSettings();
      return NextResponse.json(publicSettings);

    } catch (error) {
      console.error('Settings fetch error:', error);
      if (error.status === 404) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  static async updateSettings(request) {
    try {
      const session = await auth();
      
      if (!session || !session.user?.email?.includes('@')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const ipAddress = request.headers.get('x-forwarded-for');
      
      const result = await AdminSettingsService.updateSettings(body, session.user.email, ipAddress);
      
      return NextResponse.json(result);

    } catch (error) {
      console.error('Settings update error:', error);
      const status = error.status || 500;
      const message = error.status ? error.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status });
    }
  }

  static async updateFinancialSettings(request) {
    try {
      const session = await auth();
      
      if (!session || !session.user?.email?.includes('@')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { financial } = body;
      
      const result = await AdminSettingsService.updateFinancialSettings(financial, session.user.email);
      
      return NextResponse.json(result);

    } catch (error) {
      console.error('Error updating financial settings:', error);
      const status = error.status || 500;
      const message = error.status ? error.message : 'Failed to update financial settings: ' + error.message;
      return NextResponse.json({ error: message }, { status });
    }
  }
}
