import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateTimestamps() {
  console.log('Starting timestamp migration...')

  try {
    // Migrate MacroEntry timestamps
    console.log('Migrating MacroEntry timestamps...')
    const macroEntries = await prisma.macroEntry.findMany({
      where: { timestamp: null },
      select: { id: true, date: true, hour: true }
    })
    
    for (const entry of macroEntries) {
      // Use the hour field as the primary timestamp since it contains both date and time
      await prisma.macroEntry.update({
        where: { id: entry.id },
        data: { timestamp: entry.hour }
      })
    }
    console.log(`✅ Migrated ${macroEntries.length} MacroEntry records`)

    // Migrate IntestinalEntry timestamps
    console.log('Migrating IntestinalEntry timestamps...')
    const intestinalEntries = await prisma.intestinalEntry.findMany({
      where: { timestamp: null },
      select: { id: true, date: true, hour: true }
    })
    
    for (const entry of intestinalEntries) {
      await prisma.intestinalEntry.update({
        where: { id: entry.id },
        data: { timestamp: entry.hour }
      })
    }
    console.log(`✅ Migrated ${intestinalEntries.length} IntestinalEntry records`)

    // Migrate ActivityEntry timestamps
    console.log('Migrating ActivityEntry timestamps...')
    const activityEntries = await prisma.activityEntry.findMany({
      where: { timestamp: null },
      select: { id: true, date: true, hour: true }
    })
    
    for (const entry of activityEntries) {
      await prisma.activityEntry.update({
        where: { id: entry.id },
        data: { timestamp: entry.hour }
      })
    }
    console.log(`✅ Migrated ${activityEntries.length} ActivityEntry records`)

    console.log('🎉 Timestamp migration completed successfully!')

    // Verify the migration
    console.log('\nVerifying migration...')
    const nullTimestamps = {
      macroEntries: await prisma.macroEntry.count({ where: { timestamp: null } }),
      intestinalEntries: await prisma.intestinalEntry.count({ where: { timestamp: null } }),
      activityEntries: await prisma.activityEntry.count({ where: { timestamp: null } })
    }

    console.log('Records with null timestamps:', nullTimestamps)
    
    if (nullTimestamps.macroEntries === 0 && 
        nullTimestamps.intestinalEntries === 0 && 
        nullTimestamps.activityEntries === 0) {
      console.log('✅ All timestamp fields have been populated successfully!')
    } else {
      console.log('⚠️  Some records still have null timestamps')
    }

  } catch (error) {
    console.error('❌ Error during migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateTimestamps() 