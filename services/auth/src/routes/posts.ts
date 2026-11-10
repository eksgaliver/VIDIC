import { Elysia, t } from 'elysia'
import { and, desc, eq, type SQL } from 'drizzle-orm'
import { jwt } from '@elysiajs/jwt'
import { db } from '../db'
import { posts, postComments, users, departments } from '../db/schema'

export const postRoutes = new Elysia({ prefix: '/posts' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  // Ambil daftar seluruh postingan berita & pengumuman
  .get('', async ({ query, headers, jwt }) => {
    let currentUserId: string | null = null
    const authHeader = headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
        if (payload?.sub) currentUserId = payload.sub
      } catch {
        // Abaikan jika token tidak valid
      }
    }

    const conditions: SQL[] = []
    if (query.companyId) {
      conditions.push(eq(posts.companyId, query.companyId))
    }
    if (query.category && query.category !== 'all') {
      conditions.push(eq(posts.category, query.category))
    }

    const postRows = await db
      .select({
        id: posts.id,
        companyId: posts.companyId,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        category: posts.category,
        mediaUrls: posts.mediaUrls,
        isPinned: posts.isPinned,
        likesCount: posts.likesCount,
        likedUserIds: posts.likedUserIds,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.avatarUrl,
        authorPosition: users.position,
        authorRole: users.role,
        departmentName: departments.name,
        departmentCode: departments.code
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.isPinned), desc(posts.createdAt))

    // Ambil komentar untuk setiap postingan
    const postIds = postRows.map((p) => p.id)
    const allComments = postIds.length > 0
      ? await db
          .select({
            id: postComments.id,
            postId: postComments.postId,
            authorId: postComments.authorId,
            content: postComments.content,
            createdAt: postComments.createdAt,
            authorName: users.name,
            authorEmail: users.email,
            authorAvatarUrl: users.avatarUrl,
            authorRole: users.role
          })
          .from(postComments)
          .leftJoin(users, eq(postComments.authorId, users.id))
          .orderBy(postComments.createdAt)
      : []

    const commentsByPostId = new Map<string, typeof allComments>()
    for (const comment of allComments) {
      const list = commentsByPostId.get(comment.postId) || []
      list.push(comment)
      commentsByPostId.set(comment.postId, list)
    }

    const formatted = postRows.map((row) => {
      const likedList = (row.likedUserIds as string[]) || []
      const isLiked = currentUserId ? likedList.includes(currentUserId) : false

      return {
        id: row.id,
        companyId: row.companyId,
        title: row.title,
        content: row.content,
        category: row.category,
        mediaUrls: (row.mediaUrls as string[]) || [],
        isPinned: row.isPinned,
        likesCount: row.likesCount,
        commentsCount: row.commentsCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isLiked,
        author: {
          id: row.authorId,
          name: row.authorName || 'Karyawan',
          email: row.authorEmail || '',
          avatarUrl: row.authorAvatarUrl,
          position: row.authorPosition || 'Staf',
          role: row.authorRole || 'member',
          department: row.departmentName
            ? { name: row.departmentName, code: row.departmentCode || '' }
            : null
        },
        comments: commentsByPostId.get(row.id) || []
      }
    })

    return { success: true, data: formatted }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String()),
      category: t.Optional(t.String())
    })
  })
  .get('/', async ({ query, headers, jwt }) => {
    let currentUserId: string | null = null
    const authHeader = headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
        if (payload?.sub) currentUserId = payload.sub
      } catch {
        // Abaikan jika token tidak valid
      }
    }

    const conditions: SQL[] = []
    if (query.companyId) {
      conditions.push(eq(posts.companyId, query.companyId))
    }
    if (query.category && query.category !== 'all') {
      conditions.push(eq(posts.category, query.category))
    }

    const postRows = await db
      .select({
        id: posts.id,
        companyId: posts.companyId,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        category: posts.category,
        mediaUrls: posts.mediaUrls,
        isPinned: posts.isPinned,
        likesCount: posts.likesCount,
        likedUserIds: posts.likedUserIds,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.avatarUrl,
        authorPosition: users.position,
        authorRole: users.role,
        departmentName: departments.name,
        departmentCode: departments.code
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.isPinned), desc(posts.createdAt))

    const postIds = postRows.map((p) => p.id)
    const allComments = postIds.length > 0
      ? await db
          .select({
            id: postComments.id,
            postId: postComments.postId,
            authorId: postComments.authorId,
            content: postComments.content,
            createdAt: postComments.createdAt,
            authorName: users.name,
            authorEmail: users.email,
            authorAvatarUrl: users.avatarUrl,
            authorRole: users.role
          })
          .from(postComments)
          .leftJoin(users, eq(postComments.authorId, users.id))
          .orderBy(postComments.createdAt)
      : []

    const commentsByPostId = new Map<string, typeof allComments>()
    for (const comment of allComments) {
      const list = commentsByPostId.get(comment.postId) || []
      list.push(comment)
      commentsByPostId.set(comment.postId, list)
    }

    const formatted = postRows.map((row) => {
      const likedList = (row.likedUserIds as string[]) || []
      const isLiked = currentUserId ? likedList.includes(currentUserId) : false

      return {
        id: row.id,
        companyId: row.companyId,
        title: row.title,
        content: row.content,
        category: row.category,
        mediaUrls: (row.mediaUrls as string[]) || [],
        isPinned: row.isPinned,
        likesCount: row.likesCount,
        commentsCount: row.commentsCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isLiked,
        author: {
          id: row.authorId,
          name: row.authorName || 'Karyawan',
          email: row.authorEmail || '',
          avatarUrl: row.authorAvatarUrl,
          position: row.authorPosition || 'Staf',
          role: row.authorRole || 'member',
          department: row.departmentName
            ? { name: row.departmentName, code: row.departmentCode || '' }
            : null
        },
        comments: commentsByPostId.get(row.id) || []
      }
    })

    return { success: true, data: formatted }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String()),
      category: t.Optional(t.String())
    })
  })
  // Buat Postingan Baru
  .post('', async ({ headers, body, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Silakan masuk untuk membuat postingan.' }
    }

    const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) {
      set.status = 401
      return { success: false, message: 'Sesi kedaluwarsa. Silakan masuk kembali.' }
    }

    const [author] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!author) {
      set.status = 404
      return { success: false, message: 'Akun pembuat tidak ditemukan.' }
    }

    const content = body.content.trim()
    if (!content) {
      set.status = 400
      return { success: false, message: 'Konten postingan tidak boleh kosong.' }
    }

    const isPinned = Boolean(body.isPinned && (author.role === 'admin' || author.position?.toLowerCase().includes('hr')))

    const [created] = await db
      .insert(posts)
      .values({
        companyId: author.companyId,
        authorId: author.id,
        title: body.title?.trim() || null,
        content,
        category: body.category || 'general',
        mediaUrls: body.mediaUrls || [],
        isPinned
      })
      .returning()

    set.status = 201
    return {
      success: true,
      data: created,
      message: 'Postingan berhasil dipublikasikan.'
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      content: t.String({ minLength: 1 }),
      category: t.Optional(t.String()),
      mediaUrls: t.Optional(t.Array(t.String())),
      isPinned: t.Optional(t.Boolean())
    })
  })
  // Berikan Like / Respon pada Postingan (Toggle Like)
  .post('/:id/like', async ({ params, headers, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Silakan masuk untuk menyukai postingan.' }
    }

    const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) {
      set.status = 401
      return { success: false, message: 'Sesi kedaluwarsa.' }
    }

    const [post] = await db.select().from(posts).where(eq(posts.id, params.id)).limit(1)
    if (!post) {
      set.status = 404
      return { success: false, message: 'Postingan tidak ditemukan.' }
    }

    const userId = payload.sub
    const likedList = (post.likedUserIds as string[]) || []
    const alreadyLiked = likedList.includes(userId)

    const updatedLikes = alreadyLiked
      ? likedList.filter((id) => id !== userId)
      : [...likedList, userId]

    const newCount = updatedLikes.length

    await db
      .update(posts)
      .set({
        likedUserIds: updatedLikes,
        likesCount: newCount,
        updatedAt: new Date()
      })
      .where(eq(posts.id, params.id))

    return {
      success: true,
      data: {
        isLiked: !alreadyLiked,
        likesCount: newCount
      }
    }
  }, {
    params: t.Object({ id: t.String() })
  })
  // Tambah Komentar pada Postingan
  .post('/:id/comments', async ({ params, headers, body, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Silakan masuk untuk berkomentar.' }
    }

    const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) {
      set.status = 401
      return { success: false, message: 'Sesi kedaluwarsa.' }
    }

    const [author] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!author) {
      set.status = 404
      return { success: false, message: 'Pengguna tidak ditemukan.' }
    }

    const content = body.content.trim()
    if (!content) {
      set.status = 400
      return { success: false, message: 'Komentar tidak boleh kosong.' }
    }

    const [comment] = await db
      .insert(postComments)
      .values({
        postId: params.id,
        authorId: author.id,
        content
      })
      .returning()

    // Tingkatkan jumlah komentar pada postingan
    const [post] = await db.select({ count: posts.commentsCount }).from(posts).where(eq(posts.id, params.id)).limit(1)
    await db
      .update(posts)
      .set({
        commentsCount: (post?.count || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(posts.id, params.id))

    return {
      success: true,
      data: {
        ...comment,
        authorName: author.name,
        authorEmail: author.email,
        authorAvatarUrl: author.avatarUrl,
        authorRole: author.role
      },
      message: 'Komentar berhasil dikirim.'
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ content: t.String({ minLength: 1 }) })
  })
  // Hapus Postingan
  .delete('/:id', async ({ params, headers, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Otorisasi diperlukan.' }
    }

    const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) {
      set.status = 401
      return { success: false, message: 'Sesi kedaluwarsa.' }
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    const [post] = await db.select().from(posts).where(eq(posts.id, params.id)).limit(1)

    if (!post) {
      set.status = 404
      return { success: false, message: 'Postingan tidak ditemukan.' }
    }

    if (post.authorId !== currentUser.id && currentUser.role !== 'admin') {
      set.status = 403
      return { success: false, message: 'Anda tidak memiliki hak untuk menghapus postingan ini.' }
    }

    await db.delete(posts).where(eq(posts.id, params.id))

    return {
      success: true,
      message: 'Postingan berhasil dihapus.'
    }
  }, {
    params: t.Object({ id: t.String() })
  })
