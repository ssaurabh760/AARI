import { PrismaClient, Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed (lightweight version)...\n')

  // Clean existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.reply.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Cleaned existing data\n')

  // Create Users (5 users)
  console.log('👤 Creating users...')
  const usersData = Array.from({ length: 5 }).map((_, i) => ({
    id: `user_${i}_${Date.now()}`,
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    avatarUrl: faker.image.avatar(),
  }))
  await prisma.user.createMany({ data: usersData })
  console.log(`✅ Created ${usersData.length} users\n`)

  // Create Documents (10 documents)
  console.log('📄 Creating documents...')
  const documentsData = Array.from({ length: 10 }).map((_, i) => ({
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

  // Create Comments and Replies (smaller amounts)
  console.log('💬 Creating comments and replies...')
  let commentCount = 0
  let replyCount = 0

  for (const doc of documentsData) {
    // 2-5 comments per document
    const numComments = faker.number.int({ min: 2, max: 5 })

    for (let i = 0; i < numComments; i++) {
      const highlightedText = faker.lorem.sentence({ min: 3, max: 8 })
      const selectionFrom = faker.number.int({ min: 0, max: 500 })
      const commentCreatedAt = faker.date.between({ from: doc.createdAt, to: new Date() })

      const comment = await prisma.comment.create({
        data: {
          documentId: doc.id,
          userId: faker.helpers.arrayElement(usersData).id,
          highlightedText,
          selectionFrom,
          selectionTo: selectionFrom + highlightedText.length,
          content: generateCommentContent(),
          isResolved: faker.datatype.boolean({ probability: 0.25 }),
          createdAt: commentCreatedAt,
        },
      })
      commentCount++

      // 0-3 replies per comment
      const numReplies = faker.number.int({ min: 0, max: 3 })

      for (let j = 0; j < numReplies; j++) {
        await prisma.reply.create({
          data: {
            commentId: comment.id,
            userId: faker.helpers.arrayElement(usersData).id,
            content: generateReplyContent(),
            createdAt: faker.date.between({ from: commentCreatedAt, to: new Date() }),
          },
        })
        replyCount++
      }
    }
  }

  console.log(`✅ Created ${commentCount} comments`)
  console.log(`✅ Created ${replyCount} replies\n`)

  // Summary
  console.log('📊 Seed Summary:')
  console.log('─'.repeat(30))
  console.log(`   Users:     ${usersData.length}`)
  console.log(`   Documents: ${documentsData.length}`)
  console.log(`   Comments:  ${commentCount}`)
  console.log(`   Replies:   ${replyCount}`)
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

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())