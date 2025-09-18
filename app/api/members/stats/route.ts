import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'update_statuses') {
      // Importar la función de actualización
      const { updateMembershipStatuses } = await import('@/lib/database');
      
      // Ejecutar actualización de estados
      await updateMembershipStatuses();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Estados de membresías actualizados usando configuración del sistema' 
      });
    }
    
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error in stats POST:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
