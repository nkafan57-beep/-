
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// تخزين البيانات
let ticketData = {
    supportRole: null,
    panelChannel: null,
    panelTitle: 'نظام التذاكر',
    panelDescription: 'اضغط على الزر لفتح تذكرة جديدة',
    ticketCount: 0,
    activeTickets: new Map(), // ticketId -> { userId, handlerId, lastActivity }
    warnings: new Map(), // userId -> count
    warningLogs: new Map() // userId -> [warnings array]
};

// الأوامر
const commands = [
    new SlashCommandBuilder()
        .setName('ارسل')
        .setDescription('إرسال رسالة خاصة لشخص')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد إرسال الرسالة له')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الشخص في الرسالة؟')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('ارسل_متعدد')
        .setDescription('إرسال رسالة خاصة لعدة أشخاص')
        .addStringOption(option =>
            option.setName('الاشخاص')
                .setDescription('الأشخاص (منفصلين بمسافة، مثال: @user1 @user2)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الأشخاص في الرسالة؟')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('تحديد_رتبة_التكتات')
        .setDescription('تحديد الرتبة المسؤولة عن التذاكر')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('الرتبة المسؤولة عن التذاكر')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('انشاء_بانل_التكتات')
        .setDescription('إنشاء بانل التذاكر')
        .addChannelOption(option =>
            option.setName('القناة')
                .setDescription('القناة التي سيتم إرسال البانل فيها')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('عنوان البانل')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('وصف البانل')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('عرض_التحذيرات')
        .setDescription('عرض سجل التحذيرات للمستخدم')
        .addUserOption(option =>
            option.setName('المستخدم')
                .setDescription('المستخدم المراد عرض تحذيراته (اختياري)')
                .setRequired(false))
];

client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    
    // التحقق من وجود التوكن
    if (!process.env.BOT_TOKEN) {
        console.error('BOT_TOKEN is not set in environment variables!');
        return;
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('Successfully reloaded application (/) commands.');
        
        // بدء مراقبة التذاكر
        startTicketMonitoring();
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            await handleSlashCommands(interaction);
        } else if (interaction.isButton()) {
            await handleButtonInteractions(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // مراقبة رسائل "مسك" و "دعم" في التذاكر
    if (message.channel.name && message.channel.name.startsWith('ticket-')) {
        await handleTicketMessages(message);
    }
});

async function handleSlashCommands(interaction) {
    const { commandName } = interaction;
    
    console.log(`Received command: ${commandName} from ${interaction.user.tag}`);
    
    try {
        switch (commandName) {
            case 'ارسل':
                await handleSendPrivateMessage(interaction);
                break;
            case 'ارسل_متعدد':
                await handleSendMultiplePrivateMessages(interaction);
                break;
            case 'تحديد_رتبة_التكتات':
                await handleSetTicketRole(interaction);
                break;
            case 'انشاء_بانل_التكتات':
                await handleCreateTicketPanel(interaction);
                break;
            case 'عرض_التحذيرات':
                await handleShowWarnings(interaction);
                break;
            default:
                await interaction.reply({ content: 'أمر غير معروف.', ephemeral: true });
        }
    } catch (error) {
        console.error(`Error in command ${commandName}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
        }
    }
}

async function handleSendPrivateMessage(interaction) {
    const user = interaction.options.getUser('الشخص');
    const message = interaction.options.getString('الرسالة');
    const mention = interaction.options.getBoolean('منشن');
    
    try {
        const finalMessage = mention ? `${user} ${message}` : message;
        await user.send(finalMessage);
        await interaction.reply({ content: `تم إرسال الرسالة بنجاح إلى ${user.tag}`, ephemeral: true });
    } catch (error) {
        console.error('Error sending private message:', error);
        await interaction.reply({ content: 'فشل في إرسال الرسالة. قد يكون لدى المستخدم رسائل خاصة مغلقة.', ephemeral: true });
    }
}

async function handleSendMultiplePrivateMessages(interaction) {
    const usersString = interaction.options.getString('الاشخاص');
    const message = interaction.options.getString('الرسالة');
    const mention = interaction.options.getBoolean('منشن');
    
    await interaction.deferReply({ ephemeral: true });
    
    // استخراج معرفات المستخدمين من المنشنز
    const userMatches = usersString.match(/<@!?(\d+)>/g);
    if (!userMatches) {
        await interaction.editReply({ content: 'لم يتم العثور على مستخدمين صالحين. يرجى استخدام المنشن مثل @user1 @user2' });
        return;
    }
    
    // استخراج الأرقام فقط
    const userIds = userMatches.map(match => match.match(/\d+/)[0]);
    
    let successCount = 0;
    let failureCount = 0;
    
    await interaction.editReply({ content: 'جاري إرسال الرسائل...' });
    
    for (const userId of userIds) {
        try {
            const user = await client.users.fetch(userId);
            if (user) {
                const finalMessage = mention ? `${user} ${message}` : message;
                await user.send(finalMessage);
                successCount++;
                console.log(`Message sent successfully to ${user.tag}`);
            }
        } catch (error) {
            console.error(`Failed to send message to user ${userId}:`, error);
            failureCount++;
        }
        
        // تأخير صغير لتجنب Rate Limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await interaction.editReply({
        content: `تم إرسال الرسائل بنجاح إلى ${successCount} مستخدم، فشل في ${failureCount} مستخدم.`
    });
}

async function handleSetTicketRole(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: 'تحتاج صلاحية المدير لاستخدام هذا الأمر.', ephemeral: true });
        return;
    }
    
    const role = interaction.options.getRole('الرتبة');
    ticketData.supportRole = role.id;
    
    await interaction.reply({ content: `تم تحديد رتبة الدعم إلى ${role.name}`, ephemeral: true });
}

async function handleCreateTicketPanel(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: 'تحتاج صلاحية المدير لاستخدام هذا الأمر.', ephemeral: true });
        return;
    }
    
    const channel = interaction.options.getChannel('القناة');
    const title = interaction.options.getString('العنوان') || ticketData.panelTitle;
    const description = interaction.options.getString('الوصف') || ticketData.panelDescription;
    
    ticketData.panelChannel = channel.id;
    ticketData.panelTitle = title;
    ticketData.panelDescription = description;
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#0099ff');
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🎫 إنشاء تذكرة')
                .setStyle(ButtonStyle.Primary)
        );
    
    try {
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'تم إنشاء بانل التذاكر بنجاح!', ephemeral: true });
    } catch (error) {
        console.error('Error creating ticket panel:', error);
        await interaction.reply({ content: 'فشل في إنشاء بانل التذاكر. تأكد من أن البوت له صلاحيات الكتابة في القناة.', ephemeral: true });
    }
}

async function handleShowWarnings(interaction) {
    const user = interaction.options.getUser('المستخدم') || interaction.user;
    const warnings = ticketData.warningLogs.get(user.id) || [];
    
    if (warnings.length === 0) {
        await interaction.reply({ content: `لا توجد تحذيرات لـ ${user.tag}`, ephemeral: true });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`سجل التحذيرات - ${user.tag}`)
        .setDescription(warnings.map((warning, index) => 
            `**${index + 1}.** ${warning.reason}\n**التاريخ:** ${new Date(warning.date).toLocaleString('ar')}\n`
        ).join('\n'))
        .setColor('#ff0000');
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleButtonInteractions(interaction) {
    if (interaction.customId === 'create_ticket') {
        await createTicket(interaction);
    } else if (interaction.customId === 'close_ticket') {
        await closeTicket(interaction);
    } else if (interaction.customId === 'call_support') {
        await callSupport(interaction);
    }
}

async function createTicket(interaction) {
    if (!ticketData.supportRole) {
        await interaction.reply({ content: 'لم يتم تحديد رتبة الدعم بعد!', ephemeral: true });
        return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        ticketData.ticketCount++;
        const ticketId = `ticket-${ticketData.ticketCount}`;
        
        const guild = interaction.guild;
        const supportRole = guild.roles.cache.get(ticketData.supportRole);
        
        const channel = await guild.channels.create({
            name: ticketId,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: supportRole.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        
        ticketData.activeTickets.set(ticketId, {
            userId: interaction.user.id,
            handlerId: null,
            lastActivity: Date.now(),
            channelId: channel.id
        });
        
        const embed = new EmbedBuilder()
            .setTitle('مرحباً بك في تذكرة الدعم!')
            .setDescription('مرحباً! شكراً لك على التواصل معنا. سيقوم أحد أعضاء الفريق بمساعدتك قريباً.')
            .setColor('#00ff00');
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🗑️ إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('call_support')
                    .setLabel('📞 استدعاء مشرف')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({ content: `تم إنشاء تذكرتك: ${channel}` });
    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({ content: 'فشل في إنشاء التذكرة. تأكد من أن البوت له صلاحيات إنشاء القنوات.' });
    }
}

async function closeTicket(interaction) {
    const channel = interaction.channel;
    if (!channel.name.startsWith('ticket-')) {
        await interaction.reply({ content: 'هذا الأمر يعمل فقط في التذاكر!', ephemeral: true });
        return;
    }
    
    ticketData.activeTickets.delete(channel.name);
    
    await interaction.reply({ content: 'سيتم إغلاق التذكرة خلال 5 ثوانِ...', ephemeral: false });
    
    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    }, 5000);
}

async function callSupport(interaction) {
    const channel = interaction.channel;
    const ticketInfo = ticketData.activeTickets.get(channel.name);
    
    if (!ticketInfo) {
        await interaction.reply({ content: 'معلومات التذكرة غير موجودة!', ephemeral: true });
        return;
    }
    
    // التحقق من مرور 5 دقائق
    const timeDiff = Date.now() - ticketInfo.lastActivity;
    if (timeDiff < 5 * 60 * 1000) {
        const remainingTime = Math.ceil((5 * 60 * 1000 - timeDiff) / 1000);
        await interaction.reply({ content: `يجب انتظار ${remainingTime} ثانية قبل استدعاء المشرف.`, ephemeral: true });
        return;
    }
    
    const supportRole = interaction.guild.roles.cache.get(ticketData.supportRole);
    if (!supportRole) {
        await interaction.reply({ content: 'رتبة الدعم غير موجودة!', ephemeral: true });
        return;
    }
    
    await interaction.reply({ content: `${supportRole} تم استدعاؤكم للمساعدة في هذه التذكرة.`, ephemeral: false });
    ticketInfo.lastActivity = Date.now();
}

async function handleTicketMessages(message) {
    const channel = message.channel;
    const ticketInfo = ticketData.activeTickets.get(channel.name);
    
    if (!ticketInfo) return;
    
    const supportRole = message.guild.roles.cache.get(ticketData.supportRole);
    if (!supportRole) return;
    
    const hasSupportRole = message.member.roles.cache.has(supportRole.id);
    
    if (message.content.toLowerCase() === 'مسك' && hasSupportRole) {
        // تجاهل إذا كان الشخص هو من فتح التذكرة
        if (message.author.id === ticketInfo.userId) return;
        
        // تجاهل إذا كانت التذكرة ممسوكة بالفعل
        if (ticketInfo.handlerId) return;
        
        ticketInfo.handlerId = message.author.id;
        ticketInfo.lastActivity = Date.now();
        
        await message.reply(`تم مسك التذكرة من قبل ${message.author}`);
        
        // بدء مراقبة هذا المستخدم
        startUserMonitoring(message.author.id);
        
    } else if (message.content.toLowerCase() === 'دعم' && message.author.id === ticketInfo.handlerId) {
        await message.channel.send(`${supportRole} تم طلب الدعم الإضافي.`);
        ticketInfo.handlerId = null; // إعادة تعيين المسؤول
        ticketInfo.lastActivity = Date.now();
    }
    
    // تحديث آخر نشاط إذا كان الرسالة من المسؤول عن التذكرة
    if (message.author.id === ticketInfo.handlerId) {
        ticketInfo.lastActivity = Date.now();
    }
}

function startTicketMonitoring() {
    setInterval(() => {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (const [ticketId, ticketInfo] of ticketData.activeTickets) {
            if (ticketInfo.handlerId && (now - ticketInfo.lastActivity) >= oneHour) {
                // إصدار تحذير
                issueWarning(ticketInfo.handlerId, 'عدم الرد على التذكرة لمدة ساعة');
                
                // إعادة تعيين آخر نشاط لتجنب التحذيرات المتكررة
                ticketInfo.lastActivity = now;
            }
        }
    }, 5 * 60 * 1000); // فحص كل 5 دقائق
}

function startUserMonitoring(userId) {
    // هذه الوظيفة تبدأ مراقبة مستخدم معين
    // يمكن توسيعها حسب الحاجة
}

function issueWarning(userId, reason) {
    const currentWarnings = ticketData.warnings.get(userId) || 0;
    const newWarningCount = currentWarnings + 1;
    
    ticketData.warnings.set(userId, newWarningCount);
    
    // تسجيل التحذير
    if (!ticketData.warningLogs.has(userId)) {
        ticketData.warningLogs.set(userId, []);
    }
    
    ticketData.warningLogs.get(userId).push({
        reason: reason,
        date: Date.now()
    });
    
    // إذا وصل لـ 3 تحذيرات، إعطاء timeout
    if (newWarningCount >= 3) {
        timeoutUser(userId);
        ticketData.warnings.set(userId, 0); // إعادة تعيين العداد
    }
}

async function timeoutUser(userId) {
    try {
        const guilds = client.guilds.cache;
        
        for (const guild of guilds.values()) {
            try {
                const member = await guild.members.fetch(userId);
                if (member) {
                    await member.timeout(30 * 60 * 1000, 'تجميع 3 تحذيرات من نظام التذاكر');
                    console.log(`User ${userId} has been timed out for 30 minutes.`);
                    break;
                }
            } catch (error) {
                // المستخدم ليس في هذا السيرفر
                continue;
            }
        }
    } catch (error) {
        console.error('Error timing out user:', error);
    }
}

// معالجة الأخطاء
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// تسجيل الدخول
if (!process.env.BOT_TOKEN) {
    console.error('BOT_TOKEN environment variable is required!');
    process.exit(1);
}

client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});
