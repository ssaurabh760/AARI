import { PrismaClient, Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...\n')

  // Clean existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.reply.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Cleaned existing data\n')

  // Create Users (batch)
  console.log('👤 Creating users...')
  const usersData = Array.from({ length: 20 }).map((_, i) => ({
    id: `user_${i}_${Date.now()}`,
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    avatarUrl: faker.image.avatar(),
  }))
  await prisma.user.createMany({ data: usersData })
  console.log(`✅ Created ${usersData.length} users\n`)

  // Create Documents (batch)
  console.log('📄 Creating documents...')
  const documentsData = Array.from({ length: 100 }).map((_, i) => ({
    id: `doc_${i}_${Date.now()}`,
    title: faker.helpers.arrayElement([
      faker.company.catchPhrase(),
      `${faker.word.adjective()} ${faker.word.noun()} Guide`,
      `Q${faker.number.int({ min: 1, max: 4 })} Report`,
      faker.lorem.sentence({ min: 3, max: 6 }).replace('.', ''),
      `Meeting Notes: ${faker.company.name()}`,
      `Project: ${faker.commerce.productName()}`,
    ]),
    content: generateDocumentContent() as Prisma.InputJsonValue,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: faker.date.recent({ days: 30 }),
  }))
  await prisma.document.createMany({ data: documentsData })
  console.log(`✅ Created ${documentsData.length} documents\n`)

  // Prepare Comments and Replies data
  console.log('💬 Preparing comments and replies...')
  const commentsData: {
    id: string
    documentId: string
    userId: string
    highlightedText: string
    selectionFrom: number
    selectionTo: number
    content: string
    isResolved: boolean
    createdAt: Date
  }[] = []

  const repliesData: {
    id: string
    commentId: string
    userId: string
    content: string
    createdAt: Date
  }[] = []

  for (const doc of documentsData) {
    // Weighted distribution for comment count
    const numComments = weightedRandom([
      { value: faker.number.int({ min: 0, max: 3 }), weight: 50 },
      { value: faker.number.int({ min: 4, max: 10 }), weight: 30 },
      { value: faker.number.int({ min: 11, max: 20 }), weight: 15 },
      { value: faker.number.int({ min: 21, max: 30 }), weight: 5 },
    ])

    for (let i = 0; i < numComments; i++) {
      const commentId = `comment_${commentsData.length}_${Date.now()}`
      const highlightedText = faker.lorem.sentence({ min: 3, max: 8 })
      const selectionFrom = faker.number.int({ min: 0, max: 500 })
      const commentCreatedAt = faker.date.between({ from: doc.createdAt, to: new Date() })

      commentsData.push({
        id: commentId,
        documentId: doc.id,
        userId: faker.helpers.arrayElement(usersData).id,
        highlightedText,
        selectionFrom,
        selectionTo: selectionFrom + highlightedText.length,
        content: generateCommentContent(),
        isResolved: faker.datatype.boolean({ probability: 0.25 }),
        createdAt: commentCreatedAt,
      })

      // Weighted distribution for reply count
      const numReplies = weightedRandom([
        { value: 0, weight: 40 },
        { value: faker.number.int({ min: 1, max: 2 }), weight: 35 },
        { value: faker.number.int({ min: 3, max: 5 }), weight: 20 },
        { value: faker.number.int({ min: 6, max: 8 }), weight: 5 },
      ])

      for (let j = 0; j < numReplies; j++) {
        repliesData.push({
          id: `reply_${repliesData.length}_${Date.now()}`,
          commentId,
          userId: faker.helpers.arrayElement(usersData).id,
          content: generateReplyContent(),
          createdAt: faker.date.between({ from: commentCreatedAt, to: new Date() }),
        })
      }
    }
  }

  // Batch insert comments
  console.log('💬 Inserting comments...')
  const BATCH_SIZE = 500
  for (let i = 0; i < commentsData.length; i += BATCH_SIZE) {
    const batch = commentsData.slice(i, i + BATCH_SIZE)
    await prisma.comment.createMany({ data: batch })
    process.stdout.write(`\r   Inserted ${Math.min(i + BATCH_SIZE, commentsData.length)}/${commentsData.length} comments`)
  }
  console.log(`\n✅ Created ${commentsData.length} comments\n`)

  // Batch insert replies
  console.log('💬 Inserting replies...')
  for (let i = 0; i < repliesData.length; i += BATCH_SIZE) {
    const batch = repliesData.slice(i, i + BATCH_SIZE)
    await prisma.reply.createMany({ data: batch })
    process.stdout.write(`\r   Inserted ${Math.min(i + BATCH_SIZE, repliesData.length)}/${repliesData.length} replies`)
  }
  console.log(`\n✅ Created ${repliesData.length} replies\n`)

  // Summary
  console.log('📊 Seed Summary:')
  console.log('─'.repeat(30))
  console.log(`   Users:     ${usersData.length}`)
  console.log(`   Documents: ${documentsData.length}`)
  console.log(`   Comments:  ${commentsData.length}`)
  console.log(`   Replies:   ${repliesData.length}`)
  console.log('─'.repeat(30))
  console.log('\n🎉 Seed completed successfully!')
}

function generateDocumentContent(): Prisma.InputJsonValue {
  const numParagraphs = faker.number.int({ min: 3, max: 6 })
  const content: Prisma.InputJsonValue[] = []

  content.push({
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: faker.lorem.sentence({ min: 4, max: 8 }).replace('.', '') }],
  })

  for (let i = 0; i < numParagraphs; i++) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: faker.lorem.paragraph({ min: 2, max: 4 }) }],
    })
  }

  return { type: 'doc', content }
}

function generateCommentContent(): string {
  const templates = [
    `Can we clarify this section?`,
    `I think we should revisit this.`,
    `This needs to be updated.`,
    `Great point!`,
    `Consider rephrasing this part.`,
    `Can we add more detail here?`,
    `+1 on this approach`,
    `Let's discuss this further.`,
    `Is this still accurate?`,
    faker.lorem.sentence(),
  ]
  return faker.helpers.arrayElement(templates)
}

function generateReplyContent(): string {
  const templates = [
    `Good point!`,
    `I agree.`,
    `Fixed!`,
    `Done.`,
    `Let's discuss offline.`,
    `I'll handle this.`,
    `Makes sense.`,
    `Thanks for catching this!`,
    faker.lorem.sentence(),
  ]
  return faker.helpers.arrayElement(templates)
}

function weightedRandom<T>(options: { value: T; weight: number }[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0)
  let random = Math.random() * totalWeight

  for (const option of options) {
    random -= option.weight
    if (random <= 0) return option.value
  }

  return options[0].value
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())