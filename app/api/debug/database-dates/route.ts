import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import { getTodayLocalDate, getUruguayDate } from "@/lib/date-utils"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener información de zona horaria de la base de datos
    const timezoneInfo = await sql`
      SELECT 
        name, 
        setting, 
        short_desc 
      FROM pg_settings 
      WHERE name IN ('timezone', 'log_timezone', 'TimeZone')
    `

    // Obtener fechas actuales en diferentes formatos
    const currentDates = await sql`
      SELECT 
        'UTC NOW' as descripcion,
        NOW()::text as valor
      UNION ALL
      SELECT 
        'UTC DATE',
        CURRENT_DATE::text
      UNION ALL
      SELECT 
        'Uruguay NOW',
        (NOW() AT TIME ZONE 'America/Montevideo')::text
      UNION ALL
      SELECT 
        'Uruguay DATE',
        (NOW() AT TIME ZONE 'America/Montevideo')::date::text
    `

    // Obtener pagos recientes con conversión de zona horaria
    const recentPayments = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_date as payment_date_utc,
        (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo') as payment_date_uruguay,
        (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date as fecha_uruguay,
        p.description,
        m.name as member_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.payment_date >= (NOW() - INTERVAL '3 days')
      ORDER BY p.payment_date DESC
      LIMIT 10
    `

    // Contar pagos para hoy y ayer en diferentes zonas horarias
    const todayPaymentsUTC = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE payment_date::date = CURRENT_DATE
    `

    const todayPaymentsUruguay = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = 
            (NOW() AT TIME ZONE 'America/Montevideo')::date
    `

    const yesterdayPaymentsUTC = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE payment_date::date = (CURRENT_DATE - INTERVAL '1 day')::date
    `

    const yesterdayPaymentsUruguay = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = 
            ((NOW() AT TIME ZONE 'America/Montevideo') - INTERVAL '1 day')::date
    `

    // Obtener información de las funciones de fecha de la aplicación
    const uruguayNow = getUruguayDate()
    const todayStr = getTodayLocalDate()

    // Calcular ayer usando la misma lógica que el API principal
    const yesterday = new Date(uruguayNow)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`

    // Verificar pagos usando las fechas calculadas por la aplicación
    const appTodayPayments = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = ${todayStr}::date
    `

    const appYesterdayPayments = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date = ${yesterdayStr}::date
    `

    // Obtener pagos agrupados por día (últimos 7 días)
    const dailyPayments = await sql`
      SELECT 
        (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date as fecha_uruguay,
        COUNT(*) as cantidad_pagos,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.payment_date >= (NOW() - INTERVAL '7 days')
      GROUP BY (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date
      ORDER BY fecha_uruguay DESC
    `

    // Probar la query exacta del API principal
    const apiTestQuery = await sql`
      SELECT 
        COUNT(*) as total_found,
        MIN((p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date) as min_date,
        MAX((p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date) as max_date
      FROM payments p
      WHERE (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date >= 
            ((NOW() AT TIME ZONE 'America/Montevideo') - INTERVAL '29 days')::date
      AND (p.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::date <= 
          (NOW() AT TIME ZONE 'America/Montevideo')::date
    `

    const debugInfo = {
      database: {
        timezone: timezoneInfo,
        currentDates: currentDates,
      },
      application: {
        uruguayNow: uruguayNow.toISOString(),
        todayStr,
        yesterdayStr,
        uruguayNowLocal: uruguayNow.toString(),
      },
      payments: {
        recent: recentPayments,
        todayUTC: todayPaymentsUTC[0],
        todayUruguay: todayPaymentsUruguay[0],
        yesterdayUTC: yesterdayPaymentsUTC[0],
        yesterdayUruguay: yesterdayPaymentsUruguay[0],
        appToday: appTodayPayments[0],
        appYesterday: appYesterdayPayments[0],
        dailyBreakdown: dailyPayments,
        apiTest: apiTestQuery[0],
      },
      analysis: {
        databaseTimezone: timezoneInfo.find((t) => t.name === "timezone")?.setting || "unknown",
        utcNow: new Date().toISOString(),
        uruguayNow: uruguayNow.toISOString(),
        timezoneOffset: uruguayNow.getTimezoneOffset(),
        isDST: uruguayNow.getTimezoneOffset() !== new Date(uruguayNow.getFullYear(), 0, 1).getTimezoneOffset(),
      },
      recommendations: [],
    }

    // Agregar recomendaciones basadas en el análisis
    if (debugInfo.analysis.databaseTimezone !== "America/Montevideo") {
      debugInfo.recommendations.push({
        issue: "Database timezone is not set to America/Montevideo",
        impact: "Date calculations may be inconsistent",
        solution:
          "Consider setting database timezone to America/Montevideo or ensure all date operations use explicit timezone conversion",
      })
    }

    if (Number(debugInfo.payments.todayUruguay.count) === 0) {
      debugInfo.recommendations.push({
        issue: "No payments found for today (Uruguay timezone)",
        impact: "Today will not appear in the daily payments view",
        solution: "Create test payments or check if payments are being saved with correct timestamps",
      })
    }

    if (Number(debugInfo.payments.yesterdayUruguay.count) === 0) {
      debugInfo.recommendations.push({
        issue: "No payments found for yesterday (Uruguay timezone)",
        impact: "Yesterday will not appear in the daily payments view",
        solution: "Create test payments or check historical payment timestamps",
      })
    }

    // Verificar consistencia entre diferentes métodos de cálculo
    if (Number(debugInfo.payments.todayUruguay.count) !== Number(debugInfo.payments.appToday.count)) {
      debugInfo.recommendations.push({
        issue: "Inconsistency between database and application date calculations for today",
        impact: "May cause display issues in the interface",
        solution: "Review date calculation functions in lib/date-utils.ts",
      })
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("Error in database dates debug API:", error)
    return NextResponse.json(
      {
        error: "Error al obtener información de debug",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
