// index.js
// Discord.js v14 — ملف واحد فقط كما طلبت. أوامر سلاش (DM فردي/جماعي) + نظام تكت متكامل + تحذيرات وتأديب تلقائي.
// يفضل Node 18+ وأعلى. ضع توكن البوت في متغير البيئة TOKEN

const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder, time } = require('discord.js');
const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

// ==== إعداد سيرفر بسيط عشان الـ uptime ====
const app = express();
app.get('/', (_, res) => res.send('Bot is alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server is running on port ${PORT}`));

// ==== بوت ديسكورد ====
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ ضع متغير البيئة TOKEN');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// ==== تخزين دائم بسيط (ملف JSON واحد) ====
const DATA_FILE = path.join(__dirname, 'bot-data.json');
const DEFAULT_DATA = {
  guilds: {
    // [guildId]: {
    //   ticket: { roleId, panelChannelId, panelTitle, panelContent, nextId, categoryId },
    //   tickets: { [channelId]: { idNumber, openerId, createdAt, claimerId, lastClaimerMsgAt, warnedOnThisHour } }
    // }
  },
  warns: {
    // [userId]: { count, logs: [{ ts, guildId, channelId, reason }] }
  }
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    const txt = fs.readFileSync(DATA_FILE, 'utf8');
    const obj = JSON.parse(txt);
    return { ...DEFAULT_DATA, ...obj };
  } catch (e) {
    console.error('⚠️ خطأ قراءة ملف البيانات:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}
async function saveData() {
  try {
    await fsp.writeFile(DATA_FILE, JSON.stringify(DATA, null, 2));
  } catch (e) {
    console.error('⚠️ خطأ حفظ ملف البيانات:', e);
  }
}
const DATA = loadData();

// ==== أدوات صغيرة ====
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function ensureGuild(gid) {
  if (!DATA.guilds[gid]) DATA.guilds[gid] = { ticket: { nextId: 1 }, tickets: {} };
  if (!DATA.guilds[gid].ticket) DATA.guilds[gid].ticket = { nextId: 1 };
  if (!DATA.guilds[gid].tickets) DATA.guilds[gid].tickets = {};
}
function canTimeout(member) {
  return member.moderatable && typeof member.disableCommunicationUntil === 'function';
}
function mention(id) { return `<@&${id}>`; }
function mentionUser(id) { return `<@${id}>`; }
function now() { return Date.now(); }

// ==== بناء أوامر السلاش ====
const cmdSendDM = new SlashCommandBuilder()
  .setName('ersal')
  .setNameLocalizations({ ar: 'ارسل' })
  .setDescription('إرسال رسالة خاصة لشخص محدد')
  .setDescriptionLocalizations({ ar: 'إرسال رسالة خاصة لشخص محدد' })
  .addUserOption(o => o.setName('المستلم').setNameLocalizations({ ar: 'المستلم' }).setDescription('الشخص المستهدف').setRequired(true))
  .addStringOption(o => o.setName('الرسالة').setNameLocalizations({ ar: 'الرسالة' }).setDescription('نص الرسالة').setRequired(true))
  .addBooleanOption(o => o.setName('منشن').setNameLocalizations({ ar: 'منشن' }).setDescription('هل تريد منشن الشخص داخل الرسالة؟').setRequired(false));

const cmdBulkDM = new SlashCommandBuilder()
  .setName('ersal-group')
  .setNameLocalizations({ ar: 'ارسال-جماعي' })
  .setDescription('إرسال رسائل خاصة لعدد تختاره من الأعضاء')
  .setDescriptionLocalizations({ ar: 'إرسال رسائل خاصة لعدد تختاره من الأعضاء' })
  .addIntegerOption(o => o.setName('العدد').setNameLocalizations({ ar: 'العدد' }).setDescription('كم عضو ترسل لهم (بدون حد أقصى)').setRequired(true).setMinValue(1))
  .addStringOption(o => o.setName('الرسالة').setNameLocalizations({ ar: 'الرسالة' }).setDescription('نص الرسالة').setRequired(true))
  .addRoleOption(o => o.setName('رتبة-اختيارية').setNameLocalizations({ ar: 'رتبة-اختيارية' }).setDescription('إن اخترتها، يرسل فقط لحملة هذه الرتبة').setRequired(false));

const cmdTicketSetRole = new SlashCommandBuilder()
  .setName('ticket-set-role')
  .setNameLocalizations({ ar: 'تكت-تعيين-رتبة' })
  .setDescription('تحديد الرتبة المسؤولة عن التكتات')
  .addRoleOption(o => o.setName('الرتبة').setNameLocalizations({ ar: 'الرتبة' }).setDescription('الرتبة المسؤولة').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const cmdTicketSetChannel = new SlashCommandBuilder()
  .setName('ticket-set-channel')
  .setNameLocalizations({ ar: 'تكت-تعيين-قناة' })
  .setDescription('تحديد القناة التي سينشر فيها بانل إنشاء التذكرة')
  .addChannelOption(o => o.setName('القناة').setNameLocalizations({ ar: 'القناة' }).setDescription('قناة نصية').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const cmdTicketSetPanel = new SlashCommandBuilder()
  .setName('ticket-set-panel')
  .setNameLocalizations({ ar: 'تكت-تعيين-بانل' })
  .setDescription('تحديد عنوان ومحتوى بانل التكت')
  .addStringOption(o => o.setName('العنوان').setNameLocalizations({ ar: 'العنوان' }).setDescription('عنوان البانل (مثلاً: تكت الدعم الفني)').setRequired(true))
  .addStringOption(o => o.setName('المحتوى').setNameLocalizations({ ar: 'المحتوى' }).setDescription('نص البانل').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const cmdTicketPublishPanel = new SlashCommandBuilder()
  .setName('ticket-publish-panel')
  .setNameLocalizations({ ar: 'تكت-نشر-بانل' })
  .setDescription('نشر بانل إنشاء التذكرة في القناة المحددة')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const cmdWarnLogs = new SlashCommandBuilder()
  .setName('warn-logs')
  .setNameLocalizations({ ar: 'سجلات-التحذير' })
  .setDescription('عرض تحذيرات عضو بسبب التأخر في التكت')
  .addUserOption(o => o.setName('العضو').setNameLocalizations({ ar: 'العضو' }).setDescription('عضو لاطّلاع سجلاته (اختياري)').setRequired(false));

// ==== تسجيل الأوامر ====
async function registerCommands() {
  const commands = [
    cmdSendDM,
    cmdBulkDM,
    cmdTicketSetRole,
    cmdTicketSetChannel,
    cmdTicketSetPanel,
    cmdTicketPublishPanel,
    cmdWarnLogs
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('🔄 تحديث أوامر السلاش (Global)...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ تم التسجيل.');
  } catch (e) {
    console.error('❌ فشل تسجيل الأوامر:', e);
  }
}

// ==== مكونات واجهة التكت ====
function panelComponents() {
  const btn = new ButtonBuilder().setCustomId('open_ticket').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary);
  return [new ActionRowBuilder().addComponents(btn)];
}
function ticketControls(canCall = true) {
  const close = new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger);
  const call = new ButtonBuilder()
    .setCustomId('call_staff')
    .setLabel('استدعاء مشرف')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canCall);
  return [new ActionRowBuilder().addComponents(close, call)];
}

// ==== منطق DM ====
async function handleSingleDM(interaction) {
  const user = interaction.options.getUser('المستلم', true);
  const text = interaction.options.getString('الرسالة', true);
  const doMention = interaction.options.getBoolean('منشن') ?? false;
  await interaction.deferReply({ ephemeral: true });

  try {
    const content = doMention ? `${mentionUser(user.id)}\n${text}` : text;
    await user.send({ content });
    await interaction.editReply(`✅ تم الإرسال إلى ${user.tag}.`);
  } catch (e) {
    await interaction.editReply(`⚠️ تعذر الإرسال إلى ${user.tag} (قد يكون مقفل الخاص).`);
  }
}

async function handleBulkDM(interaction) {
  const count = interaction.options.getInteger('العدد', true);
  const content = interaction.options.getString('الرسالة', true);
  const role = interaction.options.getRole('رتبة-اختيارية', false);

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  try {
    await guild.members.fetch(); // تأكد من تعبئة الكاش
  } catch {}

  const allMembers = guild.members.cache
    .filter(m => !m.user.bot)
    .filter(m => (role ? m.roles.cache.has(role.id) : true));

  let sent = 0, failed = 0;
  for (const m of allMembers.values()) {
    if (sent >= count) break;
    try {
      await m.send({ content });
      sent++;
    } catch {
      failed++;
    }
    // منع الضغط الزائد (بدون تأخير كبير)
    await sleep(200);
  }

  await interaction.editReply(`📨 إرسال جماعي انتهى — تم الإرسال: **${sent}** | فشل: **${failed}**.`);
}

// ==== نظام التكت ====
async function ensureTicketCategory(guild, gdata) {
  if (gdata.ticket.categoryId) {
    const existing = guild.channels.cache.get(gdata.ticket.categoryId);
    if (existing && existing.type === ChannelType.GuildCategory) return existing;
  }
  // ابحث عن كاتيجوري باسم Tickets، أو أنشئ واحدة
  let cat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('tickets'));
  if (!cat) {
    cat = await guild.channels.create({ name: 'Tickets', type: ChannelType.GuildCategory });
  }
  gdata.ticket.categoryId = cat.id;
  await saveData();
  return cat;
}

async function publishPanel(interaction) {
  const gid = interaction.guild.id;
  ensureGuild(gid);
  const gdata = DATA.guilds[gid];

  const roleId = gdata.ticket.roleId;
  const panelChannelId = gdata.ticket.panelChannelId;
  const title = gdata.ticket.panelTitle || 'تكت الدعم الفني';
  const content = gdata.ticket.panelContent || 'اضغط على الزر لفتح تذكرة.';

  if (!roleId || !panelChannelId) {
    return interaction.reply({ content: '⚠️ رجاءً عيّن الرتبة والقناة أولاً.', ephemeral: true });
  }

  const ch = interaction.guild.channels.cache.get(panelChannelId);
  if (!ch || ch.type !== ChannelType.GuildText) {
    return interaction.reply({ content: '⚠️ القناة المحددة غير صالحة.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(content)
    .setColor(0x2b2d31);

  await ch.send({ embeds: [embed], components: panelComponents() });
  await interaction.reply({ content: '✅ تم نشر البانل.', ephemeral: true });
}

async function openTicket(interaction) {
  const gid = interaction.guild.id;
  ensureGuild(gid);
  const gdata = DATA.guilds[gid];

  const staffRoleId = gdata.ticket.roleId;
  if (!staffRoleId) {
    return interaction.reply({ content: '⚠️ لم يتم تعيين رتبة الطاقم بعد.', ephemeral: true });
  }

  const cat = await ensureTicketCategory(interaction.guild, gdata);
  const idNumber = gdata.ticket.nextId || 1;
  const channelName = `ticket-${idNumber}`;

  const everyone = interaction.guild.roles.everyone;
  const opener = interaction.user;

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cat.id,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: opener.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] }
    ]
  });

  gdata.ticket.nextId = idNumber + 1;
  gdata.tickets[channel.id] = {
    idNumber,
    openerId: opener.id,
    createdAt: now(),
    claimerId: null,
    lastClaimerMsgAt: null,
    warnedOnThisHour: false // لمنع تكرار التحذير لنفس الساعة
  };
  await saveData();

  const welcome = `مرحباً ${mentionUser(opener.id)} 👋\nيرجى وصف مشكلتك.\n- لطاقم الدعم: اكتب **مسك** لتثبيت نفسك كمستلم التذكرة.\n- بعد ذلك، يمكنك كتابة **دعم** لمناداة الطاقم.\n> ملاحظة: زر "استدعاء مشرف" يُتاح بعد 5 دقائق.`;
  await channel.send({ content: welcome, components: ticketControls(false) });

  await interaction.reply({ content: `🎫 تم إنشاء ${channel}`, ephemeral: true });

  // تمكين زر الاستدعاء بعد 5 دقائق
  setTimeout(async () => {
    try {
      const msg = await channel.send({ content: 'يمكنك الآن استخدام زر **استدعاء مشرف** عند الحاجة.', components: ticketControls(true) });
      // إزالة الأزرار القديمة إن وجدت (اختياري)
      setTimeout(async () => { try { await msg.edit({ components: ticketControls(true) }); } catch {} }, 500);
    } catch {}
  }, 5 * 60 * 1000);
}

async function closeTicket(interaction) {
  const ch = interaction.channel;
  if (!ch || ch.type !== ChannelType.GuildText) return interaction.reply({ content: '⚠️ أمر في غير قناة تكت.', ephemeral: true });

  const gid = interaction.guild.id;
  ensureGuild(gid);
  const gdata = DATA.guilds[gid];
  const t = gdata.tickets[ch.id];
  if (!t) return interaction.reply({ content: '⚠️ ليست قناة تكت معروفة.', ephemeral: true });

  await interaction.reply({ content: '🧹 سيتم إغلاق التذكرة خلال 5 ثوانٍ.' });
  setTimeout(async () => {
    try { await ch.delete('Closed ticket'); } catch {}
    delete gdata.tickets[ch.id];
    await saveData();
  }, 5000);
}

async function callStaff(interaction) {
  const gid = interaction.guild.id;
  ensureGuild(gid);
  const gdata = DATA.guilds[gid];
  const t = gdata.tickets[interaction.channel.id];
  if (!t) return interaction.reply({ content: '⚠️ ليست قناة تكت.', ephemeral: true });

  const staffRoleId = gdata.ticket.roleId;
  if (!staffRoleId) return interaction.reply({ content: '⚠️ لم يتم تعيين رتبة الطاقم.', ephemeral: true });

  // منشن بدون إيمبد
  await interaction.reply({ content: `${mention(staffRoleId)}`, allowedMentions: { roles: [staffRoleId] } });
}

// ==== مراقبة الرسائل داخل التكت (مسك / دعم) ====
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.guild || msg.author.bot || msg.channel.type !== ChannelType.GuildText) return;
    const gid = msg.guild.id;
    ensureGuild(gid);
    const gdata = DATA.guilds[gid];
    const t = gdata.tickets[msg.channel.id];
    if (!t) return;

    const staffRoleId = gdata.ticket.roleId;
    const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
    const hasStaff = member?.roles.cache.has(staffRoleId);

    // "مسك" — يثبت أول شخص معه الرتبة (غير الفاتح) فقط مرة
    if (msg.content.trim() === 'مسك') {
      if (!hasStaff) return; // لازم معه الرتبة
      if (msg.author.id === t.openerId) return; // الفاتح لا يُحسب
      if (!t.claimerId) {
        t.claimerId = msg.author.id;
        t.lastClaimerMsgAt = now();
        t.warnedOnThisHour = false;
        await saveData();
        await msg.channel.send({ content: `✅ تم مسك التذكرة من قبل ${mentionUser(msg.author.id)}.` });
      }
      return;
    }

    // تحديث آخر رسالة للـ claimer
    if (t.claimerId === msg.author.id) {
      t.lastClaimerMsgAt = now();
      // عند كتابة "دعم" من الـ claimer — منشن الرتبة
      if (msg.content.trim() === 'دعم' && staffRoleId) {
        await msg.channel.send({ content: `${mention(staffRoleId)}`, allowedMentions: { roles: [staffRoleId] } });
      }
      await saveData();
    }
  } catch {}
});

// ==== تحذيرات ومراقبة التأخر (كل 5 دقائق) ====
setInterval(async () => {
  const nowTs = now();
  for (const [gid, gdata] of Object.entries(DATA.guilds)) {
    const guild = client.guilds.cache.get(gid);
    if (!guild) continue;

    for (const [chId, t] of Object.entries(gdata.tickets)) {
      if (!t.claimerId || !t.lastClaimerMsgAt) continue;
      const elapsed = nowTs - t.lastClaimerMsgAt;

      // إذا مرّت ساعة منذ آخر رسالة للـ claimer
      if (elapsed >= 60 * 60 * 1000 && !t.warnedOnThisHour) {
        t.warnedOnThisHour = true; // منع تكرار التحذير لنفس الساعة لهذه التذكرة
        // سجل التحذير
        if (!DATA.warns[t.claimerId]) DATA.warns[t.claimerId] = { count: 0, logs: [] };
        DATA.warns[t.claimerId].count += 1;
        DATA.warns[t.claimerId].logs.push({ ts: nowTs, guildId: gid, channelId: chId, reason: 'تأخر عن التكت ساعة.' });
        await saveData();

        // إخطار في القناة
        const ch = guild.channels.cache.get(chId);
        if (ch && ch.type === ChannelType.GuildText) {
          ch.send({ content: `⚠️ ${mentionUser(t.claimerId)} تم تسجيل تحذير بسبب التأخر في الرد على التذكرة.` }).catch(() => {});
        }

        // تطبيق عقوبة عند 3 تحذيرات
        if (DATA.warns[t.claimerId].count >= 3) {
          const member = await guild.members.fetch(t.claimerId).catch(() => null);
          if (member && canTimeout(member)) {
            const until = new Date(Date.now() + 30 * 60 * 1000);
            member.disableCommunicationUntil(until, '3 تحذيرات تأخر في التكت').catch(() => {});
            const ch2 = guild.channels.cache.get(chId);
            ch2?.send({ content: `⛔ تم تطبيق تايم آوت 30 دقيقة على ${mentionUser(t.claimerId)} بسبب تكرار التأخر.` }).catch(() => {});
          }
        }
      }

      // إعادة السماح بتحذير جديد بعد نشاط claimer جديد
      if (elapsed < 60 * 60 * 1000 && t.warnedOnThisHour) {
        // سيعاد ضبط warnedOnThisHour عند رسالة جديدة للـ claimer (تم فوق)
      }
    }
  }
}, 5 * 60 * 1000);

// ==== تعامل مع الإنترآكشن ====
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;
      if (name === 'ersal' || name === 'ارسل') return handleSingleDM(interaction);
      if (name === 'ersal-group' || name === 'ارسال-جماعي') return handleBulkDM(interaction);

      if (name === 'ticket-set-role' || name === 'تكت-تعيين-رتبة') {
        const role = interaction.options.getRole('الرتبة', true);
        ensureGuild(interaction.guild.id);
        DATA.guilds[interaction.guild.id].ticket.roleId = role.id;
        await saveData();
        return interaction.reply({ content: `✅ تم تعيين الرتبة: ${mention(role.id)}`, ephemeral: true });
      }

      if (name === 'ticket-set-channel' || name === 'تكت-تعيين-قناة') {
        const ch = interaction.options.getChannel('القناة', true);
        ensureGuild(interaction.guild.id);
        DATA.guilds[interaction.guild.id].ticket.panelChannelId = ch.id;
        await saveData();
        return interaction.reply({ content: `✅ تم تعيين القناة: <#${ch.id}>`, ephemeral: true });
      }

      if (name === 'ticket-set-panel' || name === 'تكت-تعيين-بانل') {
        const title = interaction.options.getString('العنوان', true);
        const content = interaction.options.getString('المحتوى', true);
        ensureGuild(interaction.guild.id);
        DATA.guilds[interaction.guild.id].ticket.panelTitle = title;
        DATA.guilds[interaction.guild.id].ticket.panelContent = content;
        await saveData();
        return interaction.reply({ content: '✅ تم حفظ العنوان والمحتوى.', ephemeral: true });
      }

      if (name === 'ticket-publish-panel' || name === 'تكت-نشر-بانل') {
        return publishPanel(interaction);
      }

      if (name === 'warn-logs' || name === 'سجلات-التحذير') {
        const user = interaction.options.getUser('العضو') || interaction.user;
        const w = DATA.warns[user.id];
        if (!w) return interaction.reply({ content: `ℹ️ لا توجد تحذيرات على ${user.tag}.`, ephemeral: true });
        const lines = w.logs.slice(-10).map((l, i) => `#${w.logs.length - 10 + i + 1 > 0 ? w.logs.length - 10 + i + 1 : i + 1} — ${new Date(l.ts).toLocaleString()} — قناة: <#${l.channelId}> — سبب: ${l.reason}`);
        const embed = new EmbedBuilder()
          .setTitle(`سجلات التحذير — ${us
