const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// قاعدة بيانات التكتات والتحذيرات
const ticketData = new Map(); // channelId -> { firstUser, lastActivity, warnings: Map(userId -> count) }
const userWarnings = new Map(); // userId -> total warnings count
let warningsChannelId = null; // قناة إرسال التحذيرات

// نظام إنشاء التكتات
let ticketCounter = 1; // عداد التكتات
let supportRoleId = null; // رتبة الدعم المسموح لها رؤية التكتات
const activeTickets = new Map(); // userId -> channelId لتتبع التكتات النشطة

// نظام مسك التكتات
const ticketSessions = new Map(); // channelId -> { holder: userId, supportRequested: boolean }
const ticketHolders = new Map(); // userId -> count of held tickets
let holdCountChannelId = null; // قناة إرسال إحصائيات مسك التكتات

// أوامر نظام التكتات
const ticketCommands = [
    new SlashCommandBuilder()
        .setName('عرض-تحذيرات')
        .setDescription('عرض تحذيرات شخص معين')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد عرض تحذيراته')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('تحديد-قناة-التحذيرات')
        .setDescription('تحديد القناة التي ستُرسل إليها التحذيرات')
        .addChannelOption(option =>
            option.setName('القناة')
                .setDescription('القناة المراد إرسال التحذيرات إليها')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('إحصائيات-التكتات')
        .setDescription('عرض إحصائيات التكتات النشطة'),

    new SlashCommandBuilder()
        .setName('مسح-تحذيرات')
        .setDescription('مسح تحذيرات شخص معين')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد مسح تحذيراته')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // أوامر نظام إنشاء التكتات الجديد
    new SlashCommandBuilder()
        .setName('رسالة-التكتات')
        .setDescription('إرسال رسالة إنشاء التكتات')
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('عنوان الرسالة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('وصف الرسالة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('لون')
                .setDescription('لون الإيمبد (hex مثل #ff0000)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('تحديد-رتبة-الدعم')
        .setDescription('تحديد الرتبة التي يمكنها رؤية التكتات')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('رتبة فريق الدعم')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('حذف-تكت')
        .setDescription('حذف التكت الحالي (يعمل فقط في التكتات)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    // أوامر نظام مسك التكتات
    new SlashCommandBuilder()
        .setName('تكتات')
        .setDescription('عرض عدد التكتات التي مسكها شخص معين')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد عرض عدد تكتاته')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('تعيين-قناة-مسك-التكتات')
        .setDescription('تحديد القناة التي ستُرسل إليها إحصائيات مسك التكتات')
        .addChannelOption(option =>
            option.setName('القناة')
                .setDescription('القناة المراد إرسال إحصائيات مسك التكتات إليها')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// دالة تنظيف النص (إزالة الهمزات والمسافات الزائدة)
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[ء]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// دالة معالجة إنشاء قناة جديدة
async function handleChannelCreate(channel) {
    // التحقق إذا كان اسم القناة يبدأ بـ "ticket"
    if (channel.type === ChannelType.GuildText && channel.name.toLowerCase().includes('ticket')) {
        console.log(`تم إنشاء تكت جديد: ${channel.name}`);

        // إنشاء بيانات التكت
        ticketData.set(channel.id, {
            firstUser: null,
            lastActivity: new Map(),
            warnings: new Map(),
            createdAt: Date.now()
        });

        // إنشاء بيانات مسك التكت
        ticketSessions.set(channel.id, {
            holder: null,
            supportRequested: false
        });

        // إرسال رسالة ترحيب في التكت
        const welcomeEmbed = {
            color: 0x00ff00,
            title: '🎫 تكت جديد',
            description: 'مرحباً! هذا تكت جديد. أول شخص يكتب هنا سيحصل على أولوية المساعدة.',
            fields: [
                { name: '⏱️ الوقت المسموح', value: 'ساعة واحدة قبل التحذير', inline: true },
                { name: '📝 التحذيرات', value: '3 تحذيرات = إبلاغ الإدارة', inline: true }
            ],
            footer: { text: 'نظام إدارة التكتات' },
            timestamp: new Date()
        };

        try {
            await channel.send({ embeds: [welcomeEmbed] });
        } catch (error) {
            console.error('خطأ في إرسال رسالة الترحيب:', error);
        }
    }
}

// دالة معالجة الرسائل في التكتات
async function handleTicketMessage(message) {
    // تجاهل رسائل البوتات
    if (message.author.bot) return false;

    // التحقق إذا كانت القناة تبدأ بـ "ticket"
    if (!message.channel.name.toLowerCase().includes('ticket')) {
        return false; // ليس تكت
    }

    const channelId = message.channel.id;
    const userId = message.author.id;
    const now = Date.now();
    const content = normalizeText(message.content);

    // إنشاء بيانات التكت إذا لم تكن موجودة
    if (!ticketData.has(channelId)) {
        ticketData.set(channelId, {
            firstUser: null,
            lastActivity: new Map(),
            warnings: new Map(),
            createdAt: Date.now()
        });
    }

    // إنشاء بيانات مسك التكت إذا لم تكن موجودة
    if (!ticketSessions.has(channelId)) {
        ticketSessions.set(channelId, {
            holder: null,
            supportRequested: false
        });
    }

    const ticket = ticketData.get(channelId);
    const session = ticketSessions.get(channelId);

    // التحقق من كلمة "دعم" أولاً قبل "مسك"
    if (content === 'دعم' || content === 'support' || content === 'da3m') {
        // التحقق إذا كان هناك ماسك للتكت
        if (!session.holder) {
            const noHolderEmbed = {
                color: 0xff9900,
                title: '⚠️ لا يوجد ماسك للتكت',
                description: 'يجب أن يكون هناك شخص ماسك للتكت أولاً قبل طلب الدعم',
                fields: [
                    { name: '📝 ملاحظة', value: 'انتظر حتى يقوم أحد أعضاء فريق الدعم بكتابة "مسك"', inline: false }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [noHolderEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على عدم وجود ماسك:', error);
            }
            return true;
        }

        // التحقق إذا كان المرسل هو ماسك التكت أو منشئ التكت
        if (userId !== session.holder && userId !== ticket.owner) {
            const noPermissionSupportEmbed = {
                color: 0xff0000,
                title: '❌ غير مسموح',
                description: 'فقط ماسك التكت أو منشئ التكت يمكنه طلب الدعم',
                fields: [
                    { name: '👤 ماسك التكت', value: `<@${session.holder}>`, inline: true },
                    { name: '👤 منشئ التكت', value: `<@${ticket.owner}>`, inline: true }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [noPermissionSupportEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على عدم صلاحية طلب الدعم:', error);
            }
            return true;
        }

        // تسجيل طلب الدعم وإعادة تعيين ماسك التكت
        session.supportRequested = true;
        session.holder = null; // إعادة تعيين حتى يتمكن إداري آخر من مسك التكت

        // إنشاء منشن للإداريين
        let adminMentions = '';
        
        // البحث عن الأعضاء الذين يمكنهم رؤية التكتات
        const guild = message.guild;
        const members = await guild.members.fetch();
        
        for (const [memberId, member] of members) {
            const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels) || 
                                 (supportRoleId && member.roles.cache.has(supportRoleId));
            
            if (hasPermission && !member.user.bot && memberId !== userId) {
                adminMentions += `<@${memberId}> `;
            }
        }

        // إرسال رسالة طلب الدعم
        const supportRequestEmbed = {
            color: 0xff6b35,
            title: '🚨 طلب دعم',
            description: `${message.author} يطلب الدعم في هذا التكت!\n**التكت متاح الآن للمسك من قبل أي إداري**`,
            fields: [
                { name: '👤 طالب الدعم', value: `${message.author.tag}`, inline: true },
                { name: '📋 الإجراء المطلوب', value: 'أي إداري يمكنه كتابة "مسك" لأخذ هذا التكت', inline: false },
                { name: '⚠️ ملاحظة', value: 'تم إعادة تعيين ماسك التكت للسماح للإداريين بالمسك', inline: false }
            ],
            footer: { text: 'نظام طلب الدعم' },
            timestamp: new Date()
        };

        try {
            if (adminMentions.trim()) {
                await message.channel.send({
                    content: `${adminMentions}\n**امسك هذا التكت**`,
                    embeds: [supportRequestEmbed]
                });
            } else {
                await message.channel.send({ embeds: [supportRequestEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال طلب الدعم:', error);
        }

        return true;
    }

    // التحقق من كلمة "مسك"
    if (content === 'مسك' || content === 'hold' || content === 'mask') {
        // التحقق إذا كان المستخدم هو منشئ التكت
        if (ticket.owner === userId) {
            const ownerErrorEmbed = {
                color: 0xff0000,
                title: '❌ غير مسموح',
                description: 'لا يمكن لمنشئ التكت أن يمسك تكته الخاص',
                fields: [
                    { name: '📝 ملاحظة', value: 'فقط أعضاء فريق الدعم يمكنهم مسك التكتات', inline: false }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [ownerErrorEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على منع منشئ التكت:', error);
            }
            return true;
        }

        // التحقق من الصلاحيات - فقط أعضاء فريق الدعم أو من لديهم صلاحية إدارة القنوات
        const member = await message.guild.members.fetch(userId);
        const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels) || 
                             (supportRoleId && member.roles.cache.has(supportRoleId));

        if (!hasPermission) {
            const noPermissionEmbed = {
                color: 0xff0000,
                title: '❌ غير مسموح',
                description: 'ليس لديك صلاحية لمسك التكتات',
                fields: [
                    { name: '🔒 الصلاحيات المطلوبة', value: 'رتبة فريق الدعم أو صلاحية إدارة القنوات', inline: false }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [noPermissionEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على عدم وجود صلاحية:', error);
            }
            return true;
        }

        // التحقق إذا لم يسبق لأحد أن مسك التكت أو إذا تم طلب الدعم
        if (!session.holder || session.supportRequested) {
            session.holder = userId;
            session.supportRequested = false;

            const holdEmbed = {
                color: 0xffd700,
                title: session.supportRequested ? '🎯 تم مسك التكت للدعم!' : '🎯 أول من مسك التكت!',
                description: `${message.author} ${session.supportRequested ? 'مسكت التكت لتقديم الدعم!' : 'أنت أول من مسكت التكت!'}`,
                fields: [
                    { name: '🏆 الحالة', value: 'ماسك التكت', inline: true },
                    { name: '⏰ وقت المسك', value: new Date().toLocaleTimeString('ar-SA'), inline: true },
                    { name: '📋 ملاحظة', value: session.supportRequested ? 'تم الاستجابة لطلب الدعم' : 'اكتب "دعم" لطلب المساعدة من الإداريين', inline: false }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [holdEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على مسك التكت:', error);
            }
        } else if (session.holder !== userId) {
            // شخص آخر مسك التكت من قبل
            const holder = await message.client.users.fetch(session.holder);
            const alreadyHeldEmbed = {
                color: 0xff9900,
                title: '⚠️ التكت محجوز بالفعل',
                description: `هذا التكت تم مسكه من قبل ${holder}`,
                fields: [
                    { name: '👤 الماسك الحالي', value: `${holder.tag}`, inline: true },
                    { name: '📝 ملاحظة', value: 'انتظر حتى يتم حل مشكلة الماسك الحالي أو يتم طلب الدعم', inline: false }
                ],
                footer: { text: 'نظام مسك التكتات' },
                timestamp: new Date()
            };

            try {
                await message.reply({ embeds: [alreadyHeldEmbed] });
            } catch (error) {
                console.error('خطأ في الرد على محاولة مسك تكت محجوز:', error);
            }
        }
        // إذا كان نفس الشخص الذي مسك التكت، لا نرسل أي رسالة
        return true;
    }

    // إذا كتب شخص آخر غير الماسك في التكت
    if (session.holder && userId !== session.holder) {
        session.supportRequested = true;
    }

    // تحديث آخر نشاط للمستخدم
    ticket.lastActivity.set(userId, now);

    return true; // تم التعامل مع الرسالة
}

// دالة فحص الخمول وإرسال التحذيرات
async function checkInactivity(client) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // ساعة واحدة بالميلي ثانية

    for (const [channelId, ticket] of ticketData.entries()) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                ticketData.delete(channelId);
                ticketSessions.delete(channelId);
                continue;
            }

            // فحص كل مستخدم في التكت
            for (const [userId, lastActivity] of ticket.lastActivity.entries()) {
                const timeSinceLastActivity = now - lastActivity;

                // إذا مر أكثر من ساعة على آخر نشاط
                if (timeSinceLastActivity > oneHour) {
                    const user = await client.users.fetch(userId);
                    if (!user) continue;

                    // زيادة عدد التحذيرات
                    const currentWarnings = ticket.warnings.get(userId) || 0;
                    const newWarnings = currentWarnings + 1;
                    ticket.warnings.set(userId, newWarnings);

                    // تحديث إجمالي التحذيرات للمستخدم
                    const totalWarnings = userWarnings.get(userId) || 0;
                    userWarnings.set(userId, totalWarnings + 1);

                    // إرسال تحذير في التكت
                    const warningEmbed = {
                        color: 0xff9900,
                        title: '⚠️ تحذير خمول',
                        description: `${user} تم تسجيل تحذير عليك بسبب عدم النشاط لأكثر من ساعة.`,
                        fields: [
                            { name: '📊 التحذيرات في هذا التكت', value: `${newWarnings}/3`, inline: true },
                            { name: '📈 إجمالي التحذيرات', value: `${totalWarnings + 1}`, inline: true },
                            { name: '⏰ وقت آخر نشاط', value: new Date(lastActivity).toLocaleString('ar-SA'), inline: true }
                        ],
                        footer: { text: '3 تحذيرات = إبلاغ الإدارة' },
                        timestamp: new Date()
                    };

                    await channel.send({ embeds: [warningEmbed] });

                    // إذا وصل لـ 3 تحذيرات في هذا التكت
                    if (newWarnings >= 3) {
                        await handleThirdWarning(channel, user, client);
                    }

                    // تحديث آخر نشاط لتجنب التحذيرات المتكررة
                    ticket.lastActivity.set(userId, now);
                }
            }
        } catch (error) {
            console.error(`خطأ في فحص التكت ${channelId}:`, error);
        }
    }
}

// دالة معالجة التحذير الثالث
async function handleThirdWarning(channel, user, client) {
    const reportEmbed = {
        color: 0xff0000,
        title: '🚨 تقرير انتهاك',
        description: `المستخدم ${user} حصل على 3 تحذيرات في التكت ${channel}`,
        fields: [
            { name: '👤 المستخدم', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🎫 التكت', value: `${channel.name}`, inline: true },
            { name: '⚠️ نوع المخالفة', value: 'عدم النشاط المتكرر', inline: true },
            { name: '📅 الوقت', value: new Date().toLocaleString('ar-SA'), inline: true },
            { name: '📊 إجمالي التحذيرات', value: `${userWarnings.get(user.id) || 0}`, inline: true }
        ],
        footer: { text: 'يجب تحذير هذا الشخص من قبل الإدارة' },
        timestamp: new Date()
    };

    // إرسال في التكت
    await channel.send({ embeds: [reportEmbed] });

    // إرسال في قناة التحذيرات إذا كانت محددة
    if (warningsChannelId) {
        try {
            const warningsChannel = await client.channels.fetch(warningsChannelId);
            if (warningsChannel) {
                await warningsChannel.send({ embeds: [reportEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال التقرير لقناة التحذيرات:', error);
        }
    }
}

// دالة إنشاء تكت جديد
async function createTicket(interaction) {
    // التحقق من وجود تكت نشط للمستخدم
    if (activeTickets.has(interaction.user.id)) {
        const existingTicketId = activeTickets.get(interaction.user.id);
        try {
            const existingChannel = await interaction.guild.channels.fetch(existingTicketId);
            if (existingChannel) {
                await interaction.reply({
                    content: `❌ لديك تكت مفتوح بالفعل: ${existingChannel}`,
                    ephemeral: true
                });
                return;
            }
        } catch (error) {
            // التكت محذوف، إزالته من القائمة
            activeTickets.delete(interaction.user.id);
        }
    }

    try {
        // إنشاء التكت
        const ticketName = `ticket-${ticketCounter}`;
        ticketCounter++;

        // صلاحيات التكت
        const permissions = [
            {
                id: interaction.guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            }
        ];

        // إضافة رتبة الدعم إذا كانت محددة
        if (supportRoleId) {
            permissions.push({
                id: supportRoleId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageMessages
                ]
            });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            permissionOverwrites: permissions
        });

        // تسجيل التكت النشط
        activeTickets.set(interaction.user.id, ticketChannel.id);

        // إنشاء بيانات التكت
        ticketData.set(ticketChannel.id, {
            firstUser: null,
            lastActivity: new Map(),
            warnings: new Map(),
            createdAt: Date.now(),
            owner: interaction.user.id
        });

        // إنشاء بيانات مسك التكت
        ticketSessions.set(ticketChannel.id, {
            holder: null,
            supportRequested: false
        });

        // رسالة ترحيب في التكت
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎫 تكت جديد')
            .setDescription(`مرحباً ${interaction.user}! تم إنشاء تكتك بنجاح.\n\n**فقط أعضاء فريق الدعم يمكنهم مسك التكت!**`)
            .addFields(
                { name: '👤 صاحب التكت', value: `${interaction.user.tag}`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: new Date().toLocaleString('ar-SA'), inline: true },
                { name: '🆔 رقم التكت', value: ticketName, inline: true },
                { name: '📝 ملاحظة', value: 'أول عضو دعم يكتب "مسك" سيحصل على أولوية التعامل مع التكت', inline: false }
            )
            .setFooter({ text: 'فريق الدعم سيساعدك قريباً!' })
            .setTimestamp();

        // زر حذف التكت
        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🗑️ حذف التكت')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({
            embeds: [welcomeEmbed],
            components: [closeButton]
        });

        await interaction.reply({
            content: `✅ تم إنشاء تكتك بنجاح: ${ticketChannel}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('خطأ في إنشاء التكت:', error);
        await interaction.reply({
            content: '❌ حدث خطأ أثناء إنشاء التكت. يرجى المحاولة مرة أخرى.',
            ephemeral: true
        });
    }
}

// دالة معالجة الأزرار
async function handleButtonInteraction(interaction) {
    if (interaction.customId === 'create_ticket') {
        await createTicket(interaction);
    } else if (interaction.customId === 'close_ticket') {
        // التحقق من أن المستخدم مخول لحذف التكت
        const channel = interaction.channel;
        if (!channel.name.includes('ticket')) {
            await interaction.reply({
                content: '❌ هذا الأمر يعمل فقط في التكتات!',
                ephemeral: true
            });
            return;
        }

        const ticket = ticketData.get(channel.id);
        const isOwner = ticket && ticket.owner === interaction.user.id;
        const isSupport = supportRoleId && interaction.member.roles.cache.has(supportRoleId);
        const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

        if (!isOwner && !isSupport && !hasManageChannels) {
            await interaction.reply({
                content: '❌ ليس لديك صلاحية لحذف هذا التكت!',
                ephemeral: true
            });
            return;
        }

        // تأكيد الحذف
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('⚠️ تأكيد حذف التكت')
            .setDescription('هل أنت متأكد من حذف هذا التكت؟ هذا الإجراء لا يمكن التراجع عنه.')
            .setTimestamp();

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_delete')
                    .setLabel('✅ نعم، احذف')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('❌ إلغاء')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });
    } else if (interaction.customId === 'confirm_delete') {
        const channel = interaction.channel;
        const ticket = ticketData.get(channel.id);

        // التحقق من مسك التكت قبل الحذف
        const session = ticketSessions.get(channel.id);
        if (session && session.holder && !session.supportRequested) {
            // إضافة تكت لماسك التكت
            const currentCount = ticketHolders.get(session.holder) || 0;
            ticketHolders.set(session.holder, currentCount + 1);

            // إرسال إحصائية للقناة المحددة
            if (holdCountChannelId) {
                try {
                    const holdCountChannel = await interaction.client.channels.fetch(holdCountChannelId);
                    const holder = await interaction.client.users.fetch(session.holder);
                    const newCount = currentCount + 1;

                    const countEmbed = {
                        color: 0x00ff00,
                        title: '📊 إحصائية مسك التكتات',
                        description: `${holder} مسك تكت وأصبح لديه **${newCount}** تكت${newCount > 1 ? 'ات' : ''}`,
                        fields: [
                            { name: '👤 الماسك', value: `${holder.tag}`, inline: true },
                            { name: '🎫 التكت', value: `${channel.name}`, inline: true },
                            { name: '📈 العدد الجديد', value: `${newCount}`, inline: true }
                        ],
                        footer: { text: 'نظام مسك التكتات' },
                        timestamp: new Date()
                    };

                    await holdCountChannel.send({ embeds: [countEmbed] });
                } catch (error) {
                    console.error('خطأ في إرسال إحصائية مسك التكت:', error);
                }
            }
        }

        if (ticket && ticket.owner) {
            activeTickets.delete(ticket.owner);
        }
        ticketData.delete(channel.id);
        ticketSessions.delete(channel.id);

        await interaction.update({
            content: '🗑️ جاري حذف التكت...',
            embeds: [],
            components: []
        });

        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                console.error('خطأ في حذف التكت:', error);
            }
        }, 2000);
    } else if (interaction.customId === 'cancel_delete') {
        await interaction.update({
            content: '❌ تم إلغاء حذف التكت.',
            embeds: [],
            components: []
        });
    }
}

// دالة معالجة أوامر التكتات
async function handleTicketCommand(interaction) {
    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'رسالة-التكتات':
                const title = interaction.options.getString('العنوان');
                const description = interaction.options.getString('الوصف');
                const color = interaction.options.getString('لون') || '#0099ff';

                // تحويل اللون إلى رقم
                const colorNumber = parseInt(color.replace('#', ''), 16);

                const ticketEmbed = new EmbedBuilder()
                    .setColor(colorNumber)
                    .setTitle(title)
                    .setDescription(description)
                    .addFields(
                        { name: '🎯 كيفية الاستخدام', value: 'اضغط على الزر أدناه لإنشاء تكت جديد', inline: false },
                        { name: '⚠️ ملاحظة', value: 'يمكنك فتح تكت واحد فقط في نفس الوقت', inline: false }
                    )
                    .setFooter({ text: 'نظام التكتات - فريق الدعم' })
                    .setTimestamp();

                const createButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_ticket')
                            .setLabel('🎫 إنشاء تكت')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎫')
                    );

                await interaction.reply({
                    embeds: [ticketEmbed],
                    components: [createButton]
                });
                break;

            case 'تحديد-رتبة-الدعم':
                const supportRole = interaction.options.getRole('الرتبة');
                supportRoleId = supportRole.id;

                const roleSetEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ تم تحديد رتبة الدعم')
                    .setDescription(`تم تعيين ${supportRole} كرتبة فريق الدعم`)
                    .addFields(
                        { name: '🏷️ الرتبة', value: supportRole.name, inline: true },
                        { name: '🆔 معرف الرتبة', value: supportRole.id, inline: true },
                        { name: '👥 عدد الأعضاء', value: `${supportRole.members.size}`, inline: true }
                    )
                    .setFooter({ text: 'نظام التكتات' })
                    .setTimestamp();

                await interaction.reply({ embeds: [roleSetEmbed] });
                break;

            case 'حذف-تكت':
                const channel = interaction.channel;

                if (!channel.name.includes('ticket')) {
                    await interaction.reply({
                        content: '❌ هذا الأمر يعمل فقط في التكتات!',
                        ephemeral: true
                    });
                    return;
                }

                const ticket = ticketData.get(channel.id);
                const isOwner = ticket && ticket.owner === interaction.user.id;
                const isSupport = supportRoleId && interaction.member.roles.cache.has(supportRoleId);
                const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

                if (!isOwner && !isSupport && !hasManageChannels) {
                    await interaction.reply({
                        content: '❌ ليس لديك صلاحية لحذف هذا التكت!',
                        ephemeral: true
                    });
                    return;
                }

                // التحقق من مسك التكت قبل الحذف
                const session = ticketSessions.get(channel.id);
                if (session && session.holder && !session.supportRequested) {
                    // إضافة تكت لماسك التكت
                    const currentCount = ticketHolders.get(session.holder) || 0;
                    ticketHolders.set(session.holder, currentCount + 1);

                    // إرسال إحصائية للقناة المحددة
                    if (holdCountChannelId) {
                        try {
                            const holdCountChannel = await interaction.client.channels.fetch(holdCountChannelId);
                            const holder = await interaction.client.users.fetch(session.holder);
                            const newCount = currentCount + 1;

                            const countEmbed = {
                                color: 0x00ff00,
                                title: '📊 إحصائية مسك التكتات',
                                description: `${holder} مسك تكت وأصبح لديه **${newCount}** تكت${newCount > 1 ? 'ات' : ''}`,
                                fields: [
                                    { name: '👤 الماسك', value: `${holder.tag}`, inline: true },
                                    { name: '🎫 التكت', value: `${channel.name}`, inline: true },
                                    { name: '📈 العدد الجديد', value: `${newCount}`, inline: true }
                                ],
                                footer: { text: 'نظام مسك التكتات' },
                                timestamp: new Date()
                            };

                            await holdCountChannel.send({ embeds: [countEmbed] });
                        } catch (error) {
                            console.error('خطأ في إرسال إحصائية مسك التكت:', error);
                        }
                    }
                }

                // حذف التكت مباشرة
                if (ticket && ticket.owner) {
                    activeTickets.delete(ticket.owner);
                }
                ticketData.delete(channel.id);
                ticketSessions.delete(channel.id);

                await interaction.reply('🗑️ جاري حذف التكت...');

                setTimeout(async () => {
                    try {
                        await channel.delete();
                    } catch (error) {
                        console.error('خطأ في حذف التكت:', error);
                    }
                }, 3000);
                break;

            case 'عرض-تحذيرات':
                const targetUser = interaction.options.getUser('الشخص');
                const userTotalWarnings = userWarnings.get(targetUser.id) || 0;

                // البحث عن تحذيرات هذا المستخدم في التكتات المختلفة
                let ticketWarningsText = '';
                for (const [channelId, ticket] of ticketData.entries()) {
                    const warningsInTicket = ticket.warnings.get(targetUser.id) || 0;
                    if (warningsInTicket > 0) {
                        try {
                            const channel = await interaction.client.channels.fetch(channelId);
                            ticketWarningsText += `• ${channel.name}: ${warningsInTicket} تحذير\n`;
                        } catch (error) {
                            ticketWarningsText += `• تكت محذوف: ${warningsInTicket} تحذير\n`;
                        }
                    }
                }

                if (!ticketWarningsText) {
                    ticketWarningsText = 'لا توجد تحذيرات';
                }

                const warningsEmbed = {
                    color: userTotalWarnings > 5 ? 0xff0000 : userTotalWarnings > 2 ? 0xff9900 : 0x00ff00,
                    title: `⚠️ تحذيرات ${targetUser.username}`,
                    thumbnail: { url: targetUser.displayAvatarURL({ dynamic: true }) },
                    fields: [
                        { name: '📊 إجمالي التحذيرات', value: `${userTotalWarnings}`, inline: true },
                        { name: '📈 الحالة', value: userTotalWarnings > 5 ? 'خطر' : userTotalWarnings > 2 ? 'تحذير' : 'جيد', inline: true },
                        { name: '🎫 التحذيرات بالتكتات', value: ticketWarningsText, inline: false }
                    ],
                    footer: { text: 'نظام إدارة التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [warningsEmbed] });
                break;

            case 'تحديد-قناة-التحذيرات':
                const warningsChannel = interaction.options.getChannel('القناة');
                warningsChannelId = warningsChannel.id;

                const channelSetEmbed = {
                    color: 0x00ff00,
                    title: '✅ تم تحديد قناة التحذيرات',
                    description: `تم تعيين ${warningsChannel} كقناة لإرسال التحذيرات`,
                    footer: { text: 'نظام إدارة التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [channelSetEmbed] });
                break;

            case 'إحصائيات-التكتات':
                const activeTickets = ticketData.size;
                let totalUsers = 0;
                let totalWarnings = 0;

                for (const ticket of ticketData.values()) {
                    totalUsers += ticket.lastActivity.size;
                    for (const warnings of ticket.warnings.values()) {
                        totalWarnings += warnings;
                    }
                }

                const statsEmbed = {
                    color: 0x3498db,
                    title: '📊 إحصائيات التكتات',
                    fields: [
                        { name: '🎫 التكتات النشطة', value: `${activeTickets}`, inline: true },
                        { name: '👥 المستخدمين المتفاعلين', value: `${totalUsers}`, inline: true },
                        { name: '⚠️ إجمالي التحذيرات', value: `${totalWarnings}`, inline: true },
                        { name: '📈 متوسط التحذيرات', value: totalUsers > 0 ? `${(totalWarnings / totalUsers).toFixed(1)}` : '0', inline: true },
                        { name: '🔗 قناة التحذيرات', value: warningsChannelId ? `<#${warningsChannelId}>` : 'غير محددة', inline: true }
                    ],
                    footer: { text: 'نظام إدارة التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [statsEmbed] });
                break;

            case 'مسح-تحذيرات':
                const userToClear = interaction.options.getUser('الشخص');
                const oldWarnings = userWarnings.get(userToClear.id) || 0;

                // مسح التحذيرات الإجمالية
                userWarnings.delete(userToClear.id);

                // مسح التحذيرات من جميع التكتات
                for (const ticket of ticketData.values()) {
                    ticket.warnings.delete(userToClear.id);
                }

                const clearEmbed = {
                    color: 0x00ff00,
                    title: '🗑️ تم مسح التحذيرات',
                    description: `تم مسح جميع تحذيرات ${userToClear}`,
                    fields: [
                        { name: '👤 المستخدم', value: `${userToClear.tag}`, inline: true },
                        { name: '⚠️ التحذيرات المحذوفة', value: `${oldWarnings}`, inline: true },
                        { name: '👑 بواسطة', value: `${interaction.user.tag}`, inline: true }
                    ],
                    footer: { text: 'نظام إدارة التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [clearEmbed] });
                break;
            // أوامر نظام مسك التكتات
            case 'تكتات':
                const targetUserTickets = interaction.options.getUser('الشخص');
                const ticketCount = ticketHolders.get(targetUserTickets.id) || 0;

                const ticketsEmbed = {
                    color: 0x00ff00,
                    title: `🎫 عدد تكتات ${targetUserTickets.username}`,
                    description: `${targetUserTickets} مسك **${ticketCount}** تكت${ticketCount > 1 ? 'ات' : ''}`,
                    thumbnail: { url: targetUserTickets.displayAvatarURL({ dynamic: true }) },
                    fields: [
                        { name: '👤 المستخدم', value: `${targetUserTickets.tag}`, inline: true },
                        { name: '📈 العدد', value: `${ticketCount}`, inline: true }
                    ],
                    footer: { text: 'نظام مسك التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [ticketsEmbed] });
                break;

            case 'تعيين-قناة-مسك-التكتات':
                const holdCountChannel = interaction.options.getChannel('القناة');
                holdCountChannelId = holdCountChannel.id;

                const holdChannelSetEmbed = {
                    color: 0x00ff00,
                    title: '✅ تم تحديد قناة مسك التكتات',
                    description: `تم تعيين ${holdCountChannel} كقناة لإرسال إحصائيات مسك التكتات`,
                    footer: { text: 'نظام مسك التكتات' },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [holdChannelSetEmbed] });
                break;

            default:
                return false; // لم يتم التعامل مع الأمر
        }
        return true; // تم التعامل مع الأمر
    } catch (error) {
        console.error('خطأ في نظام التكتات:', error);
        throw error;
    }
}

// دالة بدء مراقبة الخمول
function startInactivityMonitoring(client) {
    // فحص كل 10 دقائق
    setInterval(() => {
        checkInactivity(client);
    }, 10 * 60 * 1000);

    console.log('✅ تم تشغيل نظام مراقبة التكتات');
}

// تصدير الوحدة
module.exports = {
    ticketCommands,
    handleTicketCommand,
    handleChannelCreate,
    handleTicketMessage,
    startInactivityMonitoring,
    handleButtonInteraction,
    normalizeText};