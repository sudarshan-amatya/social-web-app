import { prisma } from "../config/prisma.js"

export async function getTrendingTags(_req, res) {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const postTags = await prisma.postTag.findMany({
      where: {
        post: {
          createdAt: {
            gte: since,
          },
          repostOfId: null,
        },
      },
      include: {
        tag: true,
      },
    })

    const counts = new Map()

    for (const item of postTags) {
      counts.set(item.tag.name, (counts.get(item.tag.name) || 0) + 1)
    }

    const trends = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return res.json({ trends })
  } catch (error) {
    console.error("GET_TRENDING_TAGS_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}