import { PrismaClient } from '@prisma/client'
import { PrismaClient as LocalTimePrismaClient } from '../prisma/generated/local-time-client'

const productionDb = new PrismaClient()
const localTimeDb = new LocalTimePrismaClient()

// Colombia is UTC-5 (5 hours behind UTC)
const COLOMBIA_OFFSET_HOURS = -5

function convertUTCToColombiaLocal(utcDate: Date): Date {
  // Colombia is UTC-5, so subtract 5 hours from UTC
  const colombiaTimeMs = utcDate.getTime() - (5 * 60 * 60 * 1000)
  
  // Return the date with Colombia time (without timezone info)
  return new Date(colombiaTimeMs)
}

async function migrateToLocalTime() {
  console.log('🚀 Starting migration to local time database...')
  console.log('📍 Converting from UTC to Colombia timezone (UTC-5)')

  try {
    // Migrate Users first
    console.log('👥 Migrating users...')
    const users = await productionDb.user.findMany()
    
    for (const user of users) {
      await localTimeDb.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: user.name,
          password: user.password,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionId: user.subscriptionId,
          customerId: user.customerId,
          trialEndDate: user.trialEndDate,
          subscriptionEndDate: user.subscriptionEndDate,
          monthlyAiUsage: user.monthlyAiUsage,
          monthlyUploads: user.monthlyUploads,
          lastUsageReset: user.lastUsageReset,
          isUnlimited: user.isUnlimited,
          activityLevel: user.activityLevel,
          age: user.age,
          gender: user.gender,
          heightCm: user.heightCm,
        },
        create: user,
      })
    }
    console.log(`✅ Migrated ${users.length} users`)

    // Migrate MacroEntries using hour column converted to Colombia local time
    console.log('🍎 Migrating macro entries...')
    const macroEntries = await productionDb.macroEntry.findMany()
    
    for (const entry of macroEntries) {
      // Use the hour field (which contains both date and time) and convert from UTC to Colombia local time
      const localDateTime = convertUTCToColombiaLocal(entry.hour)
      
      console.log(`📅 Converting macro entry ${entry.id}: ${entry.hour.toISOString()} → ${localDateTime.toISOString().replace('Z', '')} (Colombia local)`)
      
      await localTimeDb.macroEntry.create({
        data: {
          id: entry.id,
          userId: entry.userId,
          description: entry.description,
          imageUrl: entry.imageUrl,
          localDateTime: localDateTime,
          calculatedMacros: entry.calculatedMacros,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      })
    }
    console.log(`✅ Migrated ${macroEntries.length} macro entries`)

    // Migrate WeightEntries using date column (keep as-is since weight is per day)
    console.log('⚖️ Migrating weight entries...')
    const weightEntries = await productionDb.weightEntry.findMany()
    
    for (const entry of weightEntries) {
      // For weight entries, use date as-is since it's already normalized to start of day
      const localDate = convertUTCToColombiaLocal(entry.date)
      
      console.log(`📅 Converting weight entry ${entry.id}: ${entry.date.toISOString()} → ${localDate.toISOString().replace('Z', '')} (Colombia local)`)
      
      await localTimeDb.weightEntry.create({
        data: {
          id: entry.id,
          userId: entry.userId,
          localDate: localDate,
          weight: entry.weight,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      })
    }
    console.log(`✅ Migrated ${weightEntries.length} weight entries`)

    // Migrate IntestinalEntries using hour column
    console.log('🏥 Migrating intestinal entries...')
    const intestinalEntries = await productionDb.intestinalEntry.findMany()
    
    for (const entry of intestinalEntries) {
      // Use the hour field (which contains both date and time) and convert from UTC to Colombia local time
      const localDateTime = convertUTCToColombiaLocal(entry.hour)
      
      console.log(`📅 Converting intestinal entry ${entry.id}: ${entry.hour.toISOString()} → ${localDateTime.toISOString().replace('Z', '')} (Colombia local)`)
      
      await localTimeDb.intestinalEntry.create({
        data: {
          id: entry.id,
          userId: entry.userId,
          localDateTime: localDateTime,
          consistency: entry.consistency,
          color: entry.color,
          painLevel: entry.painLevel,
          notes: entry.notes,
          imageUrl: entry.imageUrl,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      })
    }
    console.log(`✅ Migrated ${intestinalEntries.length} intestinal entries`)

    // Migrate ActivityEntries using hour column
    console.log('🏃 Migrating activity entries...')
    const activityEntries = await productionDb.activityEntry.findMany()
    
    for (const entry of activityEntries) {
      // Use the hour field (which contains both date and time) and convert from UTC to Colombia local time
      const localDateTime = convertUTCToColombiaLocal(entry.hour)
      
      console.log(`📅 Converting activity entry ${entry.id}: ${entry.hour.toISOString()} → ${localDateTime.toISOString().replace('Z', '')} (Colombia local)`)
      
      await localTimeDb.activityEntry.create({
        data: {
          id: entry.id,
          userId: entry.userId,
          activityType: entry.activityType,
          description: entry.description,
          duration: entry.duration,
          intensity: entry.intensity,
          caloriesBurned: entry.caloriesBurned,
          caloriesManuallyEntered: entry.caloriesManuallyEntered,
          localDateTime: localDateTime,
          notes: entry.notes,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      })
    }
    console.log(`✅ Migrated ${activityEntries.length} activity entries`)

    console.log('🎉 Migration completed successfully!')

    // Verification
    console.log('\n📊 Verification:')
    const newUserCount = await localTimeDb.user.count()
    const newMacroCount = await localTimeDb.macroEntry.count()
    const newWeightCount = await localTimeDb.weightEntry.count()
    const newIntestinalCount = await localTimeDb.intestinalEntry.count()
    const newActivityCount = await localTimeDb.activityEntry.count()
    
    console.log(`Users: ${users.length} → ${newUserCount}`)
    console.log(`Macro entries: ${macroEntries.length} → ${newMacroCount}`)
    console.log(`Weight entries: ${weightEntries.length} → ${newWeightCount}`)
    console.log(`Intestinal entries: ${intestinalEntries.length} → ${newIntestinalCount}`)
    console.log(`Activity entries: ${activityEntries.length} → ${newActivityCount}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await productionDb.$disconnect()
    await localTimeDb.$disconnect()
  }
}

migrateToLocalTime() 