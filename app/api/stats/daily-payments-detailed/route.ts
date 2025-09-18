import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/database"
import { getTodayLocalDate, addDaysToToday, debugDate, getCurrentMonthInfo } from "@/lib/date-utils"

interface DailyPayment {
  id: number
  amount: number
  paymentMethod: string
  description: string
  member: {
    name: string
    email: string
    phone: string
    status: string
  }
  membership: string
  createdBy: string
}

interface DailyData {
  date: string
  dayName: string
  dayNumber: number
  monthName: string
  isToday: boolean
  isYesterday: boolean
  payments: DailyPayment[]
  summary: {
    totalAmount: number
    paymentCount: number
    averageAmount: number
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get("days")
    const days = daysParam ? Number.parseInt(daysParam) : 30

    // Debug de fechas - CORREGIR PROBLEMA DE ZONA HORARIA
    debugDate("DAILY PAYMENTS DETAILED API - CORRIGIENDO ZONA HORARIA")
    const monthInfo = getCurrentMonthInfo()
    console.log("📊 Daily Payments - Información del mes actual:", monthInfo)

    const todayUruguay = getTodayLocalDate()
    const yesterdayUruguay = addDaysToToday(-1)
    const startDate = addDaysToToday(-days + 1)

    console.log("🗓️ DAILY PAYMENTS API - FECHAS URUGUAY CORRECTAS:", {
      todayUruguay,
      yesterdayUruguay,
      startDate,
      daysRequested: days,
      currentTime: new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }),
    })

    // CONSULTA CORRIGIENDO ZONA HORARIA
    // El problema es que payment_date puede estar en UTC y necesitamos convertirlo a Uruguay
    const paymentsResult = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.description,
        p.payment_date,
        p.created_at,
        m.name as member_name,
        m.email as member_email,
        m.phone as member_phone,
        m.status as member_status,
        ms.name as membership_name,
        COALESCE(u.username, u.name, 'Sistema') as created_by_name,
        -- Convertir created_at a fecha local de Uruguay para verificar
        DATE(p.created_at AT TIME ZONE 'America/Montevideo') as created_date_uruguay,
        -- Si payment_date es DATE, usarlo directamente, si no convertir
        CASE 
          WHEN p.payment_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN p.payment_date::date
          ELSE DATE(p.payment_date AT TIME ZONE 'America/Montevideo')
        END as payment_date_uruguay
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN memberships ms ON p.membership_id = ms.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.payment_date >= ${startDate}::date - interval '1 day'
      AND p.payment_date <= ${todayUruguay}::date + interval '1 day'
      ORDER BY p.payment_date DESC, p.created_at DESC
    `

    console.log("🗓️ PAYMENTS QUERY RESULT - ANÁLISIS ZONA HORARIA:", {
      totalPayments: paymentsResult.length,
      queryStartDate: startDate,
      queryEndDate: todayUruguay,
      samplePayments: paymentsResult.slice(0, 10).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        created_at: p.created_at,
        created_date_uruguay: p.created_date_uruguay,
        payment_date_uruguay: p.payment_date_uruguay,
        member_name: p.member_name,
      })),
    })

    // Analizar específicamente los pagos problemáticos
    const paymentsJuly1 = paymentsResult.filter((p) => {
      const paymentDateStr = p.payment_date_uruguay.toISOString().split("T")[0]
      return paymentDateStr === "2025-07-01"
    })

    const paymentsJuly2 = paymentsResult.filter((p) => {
      const paymentDateStr = p.payment_date_uruguay.toISOString().split("T")[0]
      return paymentDateStr === "2025-07-02"
    })

    console.log("🔍 ANÁLISIS PAGOS 1 Y 2 DE JULIO:", {
      july1Count: paymentsJuly1.length,
      july1Total: paymentsJuly1.reduce((sum, p) => sum + Number(p.amount), 0),
      july1Payments: paymentsJuly1.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        created_at: p.created_at,
        created_date_uruguay: p.created_date_uruguay,
        member: p.member_name,
      })),
      july2Count: paymentsJuly2.length,
      july2Total: paymentsJuly2.reduce((sum, p) => sum + Number(p.amount), 0),
      july2Payments: paymentsJuly2.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        created_at: p.created_at,
        created_date_uruguay: p.created_date_uruguay,
        member: p.member_name,
      })),
    })

    // Generar estructura de días
    const dailyDataMap = new Map<string, DailyData>()

    for (let i = 0; i < days; i++) {
      const dateStr = addDaysToToday(-i)
      const uruguayDate = new Date(dateStr + "T12:00:00")

      const dayName = uruguayDate.toLocaleDateString("es-ES", {
        weekday: "long",
        timeZone: "America/Montevideo",
      })
      const monthName = uruguayDate.toLocaleDateString("es-ES", {
        month: "long",
        timeZone: "America/Montevideo",
      })
      const dayNumber = uruguayDate.getDate()

      const isToday = dateStr === todayUruguay
      const isYesterday = dateStr === yesterdayUruguay

      dailyDataMap.set(dateStr, {
        date: dateStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dayNumber,
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        isToday,
        isYesterday,
        payments: [],
        summary: {
          totalAmount: 0,
          paymentCount: 0,
          averageAmount: 0,
        },
      })
    }

    console.log("🗓️ DÍAS GENERADOS:", {
      totalDays: dailyDataMap.size,
      todayKey: todayUruguay,
      yesterdayKey: yesterdayUruguay,
      allDates: Array.from(dailyDataMap.keys()).slice(0, 10),
    })

    // Procesar cada pago y asignarlo al día correcto según zona horaria de Uruguay
    let paymentsProcessed = 0
    let paymentsMatched = 0

    for (const payment of paymentsResult) {
      paymentsProcessed++

      // Usar payment_date_uruguay que ya está corregido por zona horaria
      const paymentDateStr = payment.payment_date_uruguay.toISOString().split("T")[0]
      const dayData = dailyDataMap.get(paymentDateStr)

      // Verificar si el pago está dentro del rango de días solicitados
      const paymentDate = new Date(paymentDateStr)
      const startDateObj = new Date(startDate)
      const todayDateObj = new Date(todayUruguay)

      const isInRange = paymentDate >= startDateObj && paymentDate <= todayDateObj

      console.log("🔍 PROCESANDO PAGO - ZONA HORARIA CORREGIDA:", {
        paymentId: payment.id,
        originalPaymentDate: payment.payment_date,
        paymentDateUruguay: payment.payment_date_uruguay,
        paymentDateStr,
        createdAt: payment.created_at,
        createdDateUruguay: payment.created_date_uruguay,
        foundDay: !!dayData,
        isInRange,
        amount: Number(payment.amount),
        member: payment.member_name,
        isToday: paymentDateStr === todayUruguay,
        isYesterday: paymentDateStr === yesterdayUruguay,
      })

      if (dayData && isInRange) {
        paymentsMatched++

        const dailyPayment: DailyPayment = {
          id: payment.id,
          amount: Number(payment.amount) || 0,
          paymentMethod: payment.payment_method || "otro",
          description: payment.description || "",
          member: {
            name: payment.member_name || "Sin nombre",
            email: payment.member_email || "",
            phone: payment.member_phone || "",
            status: payment.member_status || "inactive",
          },
          membership: payment.membership_name || "Sin membresía",
          createdBy: payment.created_by_name || "Sistema",
        }

        dayData.payments.push(dailyPayment)
        dayData.summary.totalAmount += dailyPayment.amount
        dayData.summary.paymentCount += 1

        console.log("✅ PAGO ASIGNADO CORRECTAMENTE:", {
          paymentId: payment.id,
          assignedToDate: paymentDateStr,
          amount: dailyPayment.amount,
          member: dailyPayment.member.name,
          dayIsToday: dayData.isToday,
          dayIsYesterday: dayData.isYesterday,
          newDayTotal: dayData.summary.totalAmount,
          newDayCount: dayData.summary.paymentCount,
        })
      } else if (!isInRange) {
        console.log("⚠️ PAGO FUERA DE RANGO:", {
          paymentId: payment.id,
          paymentDateStr,
          startDate,
          todayUruguay,
          isInRange,
        })
      } else {
        console.log("❌ DÍA NO ENCONTRADO PARA PAGO:", {
          paymentId: payment.id,
          paymentDateStr,
          availableDates: Array.from(dailyDataMap.keys()).slice(0, 5),
        })
      }
    }

    console.log("📊 PROCESAMIENTO COMPLETADO - ZONA HORARIA CORREGIDA:", {
      paymentsProcessed,
      paymentsMatched,
      unmatchedPayments: paymentsProcessed - paymentsMatched,
    })

    // Verificar específicamente los días problemáticos
    const todayData = dailyDataMap.get(todayUruguay)
    const yesterdayData = dailyDataMap.get(yesterdayUruguay)

    console.log("🎯 VERIFICACIÓN DÍAS ESPECÍFICOS:", {
      today: {
        date: todayUruguay,
        exists: !!todayData,
        payments: todayData?.summary.paymentCount || 0,
        amount: todayData?.summary.totalAmount || 0,
        isMarkedAsToday: todayData?.isToday || false,
        paymentDetails:
          todayData?.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            member: p.member.name,
          })) || [],
      },
      yesterday: {
        date: yesterdayUruguay,
        exists: !!yesterdayData,
        payments: yesterdayData?.summary.paymentCount || 0,
        amount: yesterdayData?.summary.totalAmount || 0,
        isMarkedAsYesterday: yesterdayData?.isYesterday || false,
        expectedAmount: 18000,
        difference: (yesterdayData?.summary.totalAmount || 0) - 18000,
        paymentDetails:
          yesterdayData?.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            member: p.member.name,
          })) || [],
      },
    })

    // Finalizar procesamiento
    const dailyDataArray: DailyData[] = []
    for (const dayData of dailyDataMap.values()) {
      if (dayData.summary.paymentCount > 0) {
        dayData.summary.averageAmount = Math.round(dayData.summary.totalAmount / dayData.summary.paymentCount)
      }

      // Ordenar pagos por monto descendente
      dayData.payments.sort((a, b) => b.amount - a.amount)
      dailyDataArray.push(dayData)
    }

    // Ordenar días por fecha descendente
    dailyDataArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calcular estadísticas
    const totalAmount = dailyDataArray.reduce((sum, day) => sum + day.summary.totalAmount, 0)
    const totalPayments = dailyDataArray.reduce((sum, day) => sum + day.summary.paymentCount, 0)
    const daysWithPayments = dailyDataArray.filter((day) => day.summary.paymentCount > 0).length
    const averageDailyAmount = daysWithPayments > 0 ? Math.round(totalAmount / daysWithPayments) : 0

    const bestDay = dailyDataArray.reduce(
      (best, current) => {
        if (current.summary.totalAmount > (best?.amount || 0)) {
          return {
            date: current.date,
            dayName: current.dayName,
            amount: current.summary.totalAmount,
            payments: current.summary.paymentCount,
          }
        }
        return best
      },
      null as { date: string; dayName: string; amount: number; payments: number } | null,
    )

    const responseData = {
      period: {
        daysRequested: days,
        daysReturned: dailyDataArray.length,
      },
      summary: {
        totalAmount,
        totalPayments,
        daysWithPayments,
        averageDailyAmount,
        bestDay,
      },
      dailyData: dailyDataArray,
    }

    console.log("📈 RESPUESTA FINAL - ZONA HORARIA CORREGIDA:", {
      totalAmount,
      totalPayments,
      daysWithPayments,
      todayAmount: dailyDataArray.find((d) => d.isToday)?.summary.totalAmount || 0,
      todayPayments: dailyDataArray.find((d) => d.isToday)?.summary.paymentCount || 0,
      yesterdayAmount: dailyDataArray.find((d) => d.isYesterday)?.summary.totalAmount || 0,
      yesterdayPayments: dailyDataArray.find((d) => d.isYesterday)?.summary.paymentCount || 0,
      daysWithData: dailyDataArray.filter((d) => d.summary.paymentCount > 0).length,
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ Error in daily payments detailed API:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        period: { daysRequested: 30, daysReturned: 0 },
        summary: {
          totalAmount: 0,
          totalPayments: 0,
          daysWithPayments: 0,
          averageDailyAmount: 0,
          bestDay: null,
        },
        dailyData: [],
      },
      { status: 500 },
    )
  }
}
