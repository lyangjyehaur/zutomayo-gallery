import { QueryInterface, DataTypes } from 'sequelize';

const ensureTable = async (
  queryInterface: QueryInterface,
  tableName: string,
  createFn: () => Promise<void>,
) => {
  const existing = await queryInterface.describeTable(tableName).catch(() => null as any);
  if (!existing) {
    await createFn();
  }
};

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  await ensureTable(queryInterface, 'mvs', async () => {
    await queryInterface.createTable('mvs', {
      id: { type: DataTypes.STRING, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: true },
      year: { type: DataTypes.STRING(4), allowNull: true },
      date: { type: DataTypes.DATE, allowNull: true },
      youtube: { type: DataTypes.STRING, allowNull: true },
      bilibili: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'media', async () => {
    await queryInterface.createTable('media', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      type: { type: DataTypes.STRING, allowNull: true },
      media_type: { type: DataTypes.STRING, defaultValue: 'image', allowNull: true },
      source: { type: DataTypes.STRING, defaultValue: 'crawler', allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      original_url: { type: DataTypes.STRING, allowNull: true },
      thumbnail_url: { type: DataTypes.STRING, allowNull: true },
      width: { type: DataTypes.INTEGER, allowNull: true },
      height: { type: DataTypes.INTEGER, allowNull: true },
      caption: { type: DataTypes.TEXT, allowNull: true },
      tags: { type: DataTypes.JSONB, defaultValue: [], allowNull: true },
      submitter_user_id: { type: DataTypes.STRING(36), allowNull: true },
      submitter_public_snapshot: { type: DataTypes.JSONB, allowNull: true },
      submission_id: { type: DataTypes.STRING(36), allowNull: true },
      group_id: { type: DataTypes.STRING(36), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('media', ['group_id']);
    await queryInterface.addIndex('media', ['type']);
    await queryInterface.addIndex('media', ['submission_id']);
  });

  await ensureTable(queryInterface, 'artists', async () => {
    await queryInterface.createTable('artists', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: true },
      twitter: { type: DataTypes.STRING, allowNull: true },
      profile_url: { type: DataTypes.STRING, allowNull: true },
      bio: { type: DataTypes.TEXT, allowNull: true },
      instagram: { type: DataTypes.STRING, allowNull: true },
      youtube: { type: DataTypes.STRING, allowNull: true },
      pixiv: { type: DataTypes.STRING, allowNull: true },
      tiktok: { type: DataTypes.STRING, allowNull: true },
      website: { type: DataTypes.STRING, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'albums', async () => {
    await queryInterface.createTable('albums', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: true },
      apple_music_album_id: { type: DataTypes.STRING(36), allowNull: true },
      hide_date: { type: DataTypes.BOOLEAN, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'keywords', async () => {
    await queryInterface.createTable('keywords', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: true },
      lang: { type: DataTypes.STRING, defaultValue: 'zh-Hant', allowNull: true },
    });
    await queryInterface.addIndex('keywords', ['name', 'lang'], { unique: true });
  });

  await ensureTable(queryInterface, 'apple_music_albums', async () => {
    await queryInterface.createTable('apple_music_albums', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      collection_id: { type: DataTypes.STRING, allowNull: true },
      album_name: { type: DataTypes.STRING, allowNull: true },
      artist_name: { type: DataTypes.STRING, allowNull: true },
      release_date: { type: DataTypes.DATE, allowNull: true },
      track_count: { type: DataTypes.INTEGER, allowNull: true },
      collection_type: { type: DataTypes.STRING, allowNull: true },
      genre: { type: DataTypes.STRING, allowNull: true },
      apple_region: { type: DataTypes.STRING, allowNull: true },
      source_url: { type: DataTypes.STRING, allowNull: true },
      r2_url: { type: DataTypes.STRING, allowNull: true },
      is_lossless: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
      is_hidden: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('apple_music_albums', ['collection_id'], { unique: true });
  });

  await ensureTable(queryInterface, 'media_groups', async () => {
    await queryInterface.createTable('media_groups', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: true },
      source_url: { type: DataTypes.STRING, allowNull: true },
      source_text: { type: DataTypes.TEXT, allowNull: true },
      author_name: { type: DataTypes.STRING, allowNull: true },
      author_handle: { type: DataTypes.STRING, allowNull: true },
      post_date: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'pending', allowNull: true },
      like_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      retweet_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      view_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      hashtags: { type: DataTypes.JSONB, defaultValue: [], allowNull: true },
    });
    await queryInterface.addIndex('media_groups', ['status']);
  });

  await ensureTable(queryInterface, 'sys_dictionaries', async () => {
    await queryInterface.createTable('sys_dictionaries', {
      id: { type: DataTypes.STRING(20), primaryKey: true },
      category: { type: DataTypes.STRING, allowNull: true },
      code: { type: DataTypes.STRING, allowNull: true },
      label: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
    });
    await queryInterface.addIndex('sys_dictionaries', ['category', 'code'], { unique: true });
  });

  await ensureTable(queryInterface, 'sys_configs', async () => {
    await queryInterface.createTable('sys_configs', {
      key: { type: DataTypes.STRING, primaryKey: true },
      value: { type: DataTypes.JSONB, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'sys_announcements', async () => {
    await queryInterface.createTable('sys_announcements', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      content: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'staging_fanarts', async () => {
    await queryInterface.createTable('staging_fanarts', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      tweet_id: { type: DataTypes.STRING, allowNull: true },
      original_url: { type: DataTypes.STRING, allowNull: true },
      media_url: { type: DataTypes.STRING, allowNull: true },
      thumbnail_url: { type: DataTypes.STRING, allowNull: true },
      author_name: { type: DataTypes.STRING, allowNull: true },
      author_handle: { type: DataTypes.STRING, allowNull: true },
      r2_url: { type: DataTypes.STRING, allowNull: true },
      media_type: { type: DataTypes.STRING, allowNull: true },
      crawled_at: { type: DataTypes.DATE, allowNull: true },
      post_date: { type: DataTypes.DATE, allowNull: true },
      source_text: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'pending', allowNull: true },
      source: { type: DataTypes.STRING, allowNull: true },
      like_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      retweet_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      view_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      media_width: { type: DataTypes.INTEGER, allowNull: true },
      media_height: { type: DataTypes.INTEGER, allowNull: true },
      hashtags: { type: DataTypes.JSONB, defaultValue: [], allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('staging_fanarts', ['tweet_id']);
    await queryInterface.addIndex('staging_fanarts', ['status']);
  });

  await ensureTable(queryInterface, 'public_users', async () => {
    await queryInterface.createTable('public_users', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: true },
      password_hash: { type: DataTypes.TEXT, allowNull: true },
      email_verified_at: { type: DataTypes.DATE, allowNull: true },
      display_name: { type: DataTypes.STRING, allowNull: true },
      social_links: { type: DataTypes.JSONB, defaultValue: {}, allowNull: true },
      public_profile_enabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
      public_profile_fields: { type: DataTypes.JSONB, defaultValue: { display_name: true, socials: true, email_masked: true }, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('public_users', ['email'], { unique: true });
  });

  await ensureTable(queryInterface, 'public_auth_tokens', async () => {
    await queryInterface.createTable('public_auth_tokens', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      user_id: { type: DataTypes.STRING(36), allowNull: true },
      purpose: { type: DataTypes.STRING, defaultValue: 'login', allowNull: true },
      token_hash: { type: DataTypes.STRING(64), allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      used_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('public_auth_tokens', ['token_hash'], { unique: true });
    await queryInterface.addIndex('public_auth_tokens', ['user_id']);
    await queryInterface.addIndex('public_auth_tokens', ['expires_at']);
  });

  await ensureTable(queryInterface, 'fanart_submissions', async () => {
    await queryInterface.createTable('fanart_submissions', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      submitter_user_id: { type: DataTypes.STRING(36), allowNull: true },
      anonymous_token_hash: { type: DataTypes.STRING(64), allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'draft', allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      contact: { type: DataTypes.TEXT, allowNull: true },
      source_type: { type: DataTypes.STRING, defaultValue: 'mixed', allowNull: true },
      special_tags: { type: DataTypes.JSONB, defaultValue: [], allowNull: true },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
      review_reason: { type: DataTypes.TEXT, allowNull: true },
      reviewed_by: { type: DataTypes.STRING, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('fanart_submissions', ['status']);
    await queryInterface.addIndex('fanart_submissions', ['submitter_user_id']);
    await queryInterface.addIndex('fanart_submissions', ['created_at']);
  });

  await ensureTable(queryInterface, 'fanart_submission_media', async () => {
    await queryInterface.createTable('fanart_submission_media', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      submission_id: { type: DataTypes.STRING(36), allowNull: true },
      media_type: { type: DataTypes.STRING, defaultValue: 'image', allowNull: true },
      tweet_id: { type: DataTypes.STRING, allowNull: true },
      original_url: { type: DataTypes.STRING, allowNull: true },
      r2_key: { type: DataTypes.STRING, allowNull: true },
      r2_url: { type: DataTypes.STRING, allowNull: true },
      thumbnail_r2_key: { type: DataTypes.STRING, allowNull: true },
      thumbnail_url: { type: DataTypes.STRING, allowNull: true },
      sha256: { type: DataTypes.STRING(64), allowNull: true },
      size_bytes: { type: DataTypes.INTEGER, allowNull: true },
      width: { type: DataTypes.INTEGER, allowNull: true },
      height: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('fanart_submission_media', ['submission_id']);
    await queryInterface.addIndex('fanart_submission_media', ['tweet_id']);
    await queryInterface.addIndex('fanart_submission_media', ['sha256']);
  });

  await ensureTable(queryInterface, 'fanart_submission_mv', async () => {
    await queryInterface.createTable('fanart_submission_mv', {
      submission_id: { type: DataTypes.STRING(36), primaryKey: true },
      mv_id: { type: DataTypes.STRING, primaryKey: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
    await queryInterface.addIndex('fanart_submission_mv', ['mv_id']);
    await queryInterface.addIndex('fanart_submission_mv', ['submission_id']);
  });

  await ensureTable(queryInterface, 'crawler_states', async () => {
    await queryInterface.createTable('crawler_states', {
      username: { type: DataTypes.STRING, primaryKey: true },
      pagination_token: { type: DataTypes.STRING, allowNull: true },
      last_crawled_month: { type: DataTypes.STRING, allowNull: true },
      total_crawled: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'idle', allowNull: true },
      current_run_processed: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      current_run_total: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'mv_media', async () => {
    await queryInterface.createTable('mv_media', {
      mv_id: { type: DataTypes.STRING, primaryKey: true },
      media_id: { type: DataTypes.STRING(36), primaryKey: true },
      usage: { type: DataTypes.STRING, allowNull: true },
      order_index: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'artist_media', async () => {
    await queryInterface.createTable('artist_media', {
      artist_id: { type: DataTypes.STRING(36), primaryKey: true },
      media_id: { type: DataTypes.STRING(36), primaryKey: true },
    });
  });

  await ensureTable(queryInterface, 'mv_artists', async () => {
    await queryInterface.createTable('mv_artists', {
      mv_id: { type: DataTypes.STRING, primaryKey: true },
      artist_id: { type: DataTypes.STRING(36), primaryKey: true },
      role: { type: DataTypes.STRING, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'mv_albums', async () => {
    await queryInterface.createTable('mv_albums', {
      mv_id: { type: DataTypes.STRING, primaryKey: true },
      album_id: { type: DataTypes.STRING(36), primaryKey: true },
      track_number: { type: DataTypes.INTEGER, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'mv_keywords', async () => {
    await queryInterface.createTable('mv_keywords', {
      mv_id: { type: DataTypes.STRING, primaryKey: true },
      keyword_id: { type: DataTypes.STRING(36), primaryKey: true },
    });
  });

  await ensureTable(queryInterface, 'admin_users', async () => {
    await queryInterface.createTable('admin_users', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      username: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: true },
      display_name: { type: DataTypes.STRING, allowNull: true },
      avatar_url: { type: DataTypes.TEXT, allowNull: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'admin_roles', async () => {
    await queryInterface.createTable('admin_roles', {
      code: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'admin_menus', async () => {
    await queryInterface.createTable('admin_menus', {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      label: { type: DataTypes.STRING, allowNull: false },
      path: { type: DataTypes.STRING, allowNull: false, unique: true },
      icon: { type: DataTypes.STRING, allowNull: true },
      sort: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
      parent_id: { type: DataTypes.STRING(36), allowNull: true },
      permission: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'auth_passkeys', async () => {
    await queryInterface.createTable('auth_passkeys', {
      id: { type: DataTypes.STRING, primaryKey: true },
      user_id: { type: DataTypes.STRING, allowNull: true },
      publicKey: { type: DataTypes.TEXT, allowNull: true },
      counter: { type: DataTypes.INTEGER, allowNull: true },
      transports: { type: DataTypes.JSONB, allowNull: true },
      name: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
    });
  });

  await ensureTable(queryInterface, 'auth_settings', async () => {
    await queryInterface.createTable('auth_settings', {
      key: { type: DataTypes.STRING, primaryKey: true },
      value: { type: DataTypes.TEXT, allowNull: true },
    });
  });
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const tables = [
    'auth_settings',
    'auth_passkeys',
    'admin_menus',
    'admin_roles',
    'admin_users',
    'mv_keywords',
    'mv_albums',
    'mv_artists',
    'artist_media',
    'mv_media',
    'crawler_states',
    'fanart_submission_mv',
    'fanart_submission_media',
    'fanart_submissions',
    'public_auth_tokens',
    'public_users',
    'staging_fanarts',
    'sys_announcements',
    'sys_configs',
    'sys_dictionaries',
    'media_groups',
    'apple_music_albums',
    'keywords',
    'albums',
    'artists',
    'media',
    'mvs',
  ];

  for (const table of tables) {
    const existing = await queryInterface.describeTable(table).catch(() => null as any);
    if (existing) {
      await queryInterface.dropTable(table);
    }
  }
};
