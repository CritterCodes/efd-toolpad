import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/designPermissions";
import AdminSettingsService from "./service.js";

/**
 * Admin settings — STAFF ONLY on every handler.
 *
 * All three gates were `session.user?.email?.includes('@')`: any authenticated user with a
 * plausible email, INCLUDING AN ARTISAN, could read and write the GLOBAL pricing/financial settings
 * (wage, markups, taxRate). The wholesale markup written here is what bills every artisan on the
 * platform. A downstream securityCode was the only thing between an artisan and repricing the
 * business.
 */

export default class AdminSettingsController {
  static async getSettings(request) {
    try {
      const session = await auth();
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (!STAFF_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (!STAFF_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (!STAFF_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
