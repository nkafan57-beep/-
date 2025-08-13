
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');

// متغيرات النظام
let unverifiedRoleId = null; // رتبة غير موثق
let verificationChannelId = null; // قناة التوثيق
const verificationButtons = new Map(); // تخزين بيانات الأزرار
let verificationMessageId = null; // معرف رسالة التوثيق

// أوامر نظام التوثيق
const verificationCommands = [
    new SlashCommandBuilder()
        .setName('تفعيل-التوثيق')
        .setDescription('تفعيل نظام التوثيق التلقائي للأعضاء الجدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('توثيق')
        .setDescription('إرسال رسالة التوثيق مع الأزرار')
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('عنوان رسالة التوثيق')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('وصف رسالة التوثيق')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('الصورة')
                .setDescription('صورة الإيمبد (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('لون')
                .setDescription('لون الإيمبد (hex مثل #ff0000)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('إضافة-زر-توثيق')
        .setDescription('إضافة زر توثيق جديد')
        .addStringOption(option =>
            option.setName('نص_الزر')
                .setDescription('النص الذي سيظهر على الزر')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('الرتبة التي سيحصل عليها العضو عند الضغط')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('نوع_الزر')
                .setDescription('نوع الزر')
                .addChoices(
                    { name: 'أساسي', value: 'Primary' },
                    { name: 'ثانوي', value: 'Secondary' },
                    { name: 'نجاح', value: 'Success' },
                    { name: 'خطر', value: 'Danger' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('الإيموجي')
                .setDescription('إيموجي للزر (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('حذف-زر-توثيق')
        .setDescription('حذف زر توثيق')
        .addStringOption(option =>
            option.setName('نص_الزر')
                .setDescription('نص الزر المراد حذفه')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('عرض-أزرار-التوثيق')
        .setDescription('عرض جميع أزرار التوثيق المضافة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('تحديث-رسالة-التوثيق')
        .setDescription('تحديث رسالة التوثيق بالأزرار الجديدة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('إعطاء-رتبة-غير-موثق')
        .setDescription('إعطاء رتبة غير موثق لجميع الأعضاء الحاليين')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('إزالة-التوثيق')
        .setDescription('إزالة التوثيق من عضو')
        .addUserOption(option =>
            option.setName('العضو')
                .setDescription('العضو المراد إزالة توثيقه')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// دالة إنشاء رتبة غير موثق
async function createUnverifiedRole(guild) {
    try {
        const existingRole = guild.roles.cache.find(role => role.name === 'غير موثق');
        if (existingRole) {
            unverifiedRoleId = existingRole.id;
            return existingRole;
        }

        const unverifiedRole = await guild.roles.create({
            name: 'غير موثق',
            color: '#ff0000',
            permissions: [],
            reason: 'إنشاء رتبة للأعضاء غير الموثقين'
        });

        unverifiedRoleId = unverifiedRole.id;
        
        // تطبيق القيود على جميع الرومات الموجودة للرتبة الجديدة
        await applyRoleRestrictionsToAllChannels(guild, unverifiedRole);
        
        return unverifiedRole;
    } catch (error) {
        console.error('خطأ في إنشاء رتبة غير موثق:', error);
        throw error;
    }
}

// دالة تطبيق القيود على جميع الرومات للرتبة غير الموثق
async function applyRoleRestrictionsToAllChannels(guild, unverifiedRole) {
    try {
        const channels = guild.channels.cache;
        
        for (const [channelId, channel] of channels) {
            // تجاهل الكاتاجوريات
            if (channel.type === 4) continue; // CategoryChannel
            
            try {
                // إخفاء جميع الرومات عن رتبة غير موثق
                await channel.permissionOverwrites.create(unverifiedRole.id, {
                    ViewChannel: false,
                    ReadMessageHistory: false
                });
            } catch (error) {
                console.error(`فشل في تطبيق القيود على الروم ${channel.name}:`, error);
            }
        }
        
        console.log('تم تطبيق القيود على جميع الرومات للرتبة غير الموثق');
    } catch (error) {
        console.error('خطأ في تطبيق القيود على الرومات:', error);
    }
}

// دالة إنشاء قناة التوثيق
async function createVerificationChannel(guild) {
    try {
        const existingChannel = guild.channels.cache.find(channel => channel.name === 'وثق-نفسك');
        if (existingChannel) {
            verificationChannelId = existingChannel.id;
            // تحديث صلاحيات القناة الموجودة لضمان رؤية رتبة غير موثق لها
            if (unverifiedRoleId) {
                const unverifiedRole = guild.roles.cache.get(unverifiedRoleId);
                if (unverifiedRole) {
                    await existingChannel.permissionOverwrites.create(unverifiedRole.id, {
                        ViewChannel: true,
                        ReadMessageHistory: true,
                        SendMessages: false
                    });
                }
            }
            return existingChannel;
        }

        const permissionOverwrites = [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
        ];

        // السماح لرتبة غير موثق برؤية قناة التوثيق فقط
        if (unverifiedRoleId) {
            permissionOverwrites.push({
                id: unverifiedRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages]
            });
        }

        const verificationChannel = await guild.channels.create({
            name: 'وثق-نفسك',
            type: ChannelType.GuildText,
            permissionOverwrites,
            reason: 'إنشاء قناة التوثيق'
        });

        verificationChannelId = verificationChannel.id;
        return verificationChannel;
    } catch (error) {
        console.error('خطأ في إنشاء قناة التوثيق:', error);
        throw error;
    }
}

// دالة معالجة دخول عضو جديد
async function handleNewMember(member) {
    if (!unverifiedRoleId) return;

    try {
        const unverifiedRole = member.guild.roles.cache.get(unverifiedRoleId);
        if (unverifiedRole) {
            await member.roles.add(unverifiedRole);
            console.log(`تم إعطاء رتبة غير موثق للعضو: ${member.user.tag}`);
            
            // إخفاء جميع الرومات عن العضو الجديد
            await hideChannelsFromMember(member);
        }
    } catch (error) {
        console.error('خطأ في إعطاء رتبة غير موثق للعضو الجديد:', error);
    }
}

// دالة إخفاء الرومات عن العضو غير الموثق
async function hideChannelsFromMember(member) {
    try {
        const guild = member.guild;
        const channels = guild.channels.cache;

        for (const [channelId, channel] of channels) {
            // تجاهل روم التوثيق
            if (channelId === verificationChannelId) continue;

            try {
                // إزالة صلاحية رؤية الروم من العضو
                await channel.permissionOverwrites.create(member.id, {
                    ViewChannel: false,
                    ReadMessageHistory: false
                });
            } catch (error) {
                console.error(`فشل في إخفاء الروم ${channel.name} عن العضو ${member.user.tag}:`, error);
            }
        }
        
        console.log(`تم إخفاء الرومات عن العضو غير الموثق: ${member.user.tag}`);
    } catch (error) {
        console.error('خطأ في إخفاء الرومات:', error);
    }
}

// دالة إظهار الرومات للعضو بعد التوثيق
async function showChannelsToMember(member) {
    try {
        const guild = member.guild;
        const channels = guild.channels.cache;

        for (const [channelId, channel] of channels) {
            try {
                // إزالة القيود المخصصة للعضو لاستعادة الصلاحيات الافتراضية
                const memberOverwrite = channel.permissionOverwrites.cache.get(member.id);
                if (memberOverwrite) {
                    await memberOverwrite.delete();
                }
            } catch (error) {
                console.error(`فشل في إظهار الروم ${channel.name} للعضو ${member.user.tag}:`, error);
            }
        }
        
        console.log(`تم إظهار الرومات للعضو الموثق: ${member.user.tag}`);
    } catch (error) {
        console.error('خطأ في إظهار الرومات:', error);
    }
}

// دالة إنشاء الأزرار
function createVerificationButtons() {
    const rows = [];
    const buttonsArray = Array.from(verificationButtons.values());
    
    // تقسيم الأزرار إلى صفوف (كل صف يحتوي على 5 أزرار كحد أقصى)
    for (let i = 0; i < buttonsArray.length; i += 5) {
        const row = new ActionRowBuilder();
        const buttonsInRow = buttonsArray.slice(i, i + 5);
        
        for (const buttonData of buttonsInRow) {
            const button = new ButtonBuilder()
                .setCustomId(`verify_${buttonData.id}`)
                .setLabel(buttonData.label)
                .setStyle(ButtonStyle[buttonData.style]);
                
            if (buttonData.emoji) {
                button.setEmoji(buttonData.emoji);
            }
            
            row.addComponents(button);
        }
        
        rows.push(row);
    }
    
    return rows;
}

// دالة معالجة الأزرار
async function handleVerificationButton(interaction) {
    if (!interaction.customId.startsWith('verify_')) return false;

    const buttonId = interaction.customId.replace('verify_', '');
    const buttonData = verificationButtons.get(buttonId);
    
    if (!buttonData) {
        await interaction.reply({
            content: '❌ هذا الزر غير صالح!',
            ephemeral: true
        });
        return true;
    }

    try {
        const member = interaction.member;
        const targetRole = interaction.guild.roles.cache.get(buttonData.roleId);
        const unverifiedRole = unverifiedRoleId ? interaction.guild.roles.cache.get(unverifiedRoleId) : null;

        if (!targetRole) {
            await interaction.reply({
                content: '❌ الرتبة المحددة لهذا الزر غير موجودة!',
                ephemeral: true
            });
            return true;
        }

        // التحقق إذا كان العضو لديه الرتبة بالفعل
        if (member.roles.cache.has(targetRole.id)) {
            await interaction.reply({
                content: `❌ لديك هذه الرتبة بالفعل: ${targetRole}`,
                ephemeral: true
            });
            return true;
        }

        // إزالة رتبة غير موثق إذا كانت موجودة
        if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
            await member.roles.remove(unverifiedRole);
        }

        // إضافة الرتبة الجديدة
        await member.roles.add(targetRole);

        // إظهار جميع الرومات للعضو بعد التوثيق
        await showChannelsToMember(member);

        const successEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ تم التوثيق بنجاح!')
            .setDescription(`تم توثيقك بنجاح وحصلت على رتبة ${targetRole}\n🔓 يمكنك الآن رؤية جميع الرومات في السيرفر!`)
            .addFields(
                { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                { name: '🏷️ الرتبة الجديدة', value: `${targetRole.name}`, inline: true },
                { name: '⏰ الوقت', value: new Date().toLocaleString('ar-SA'), inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

        // إرسال رسالة في القناة العامة (اختياري)
        const logEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎉 عضو جديد تم توثيقه!')
            .setDescription(`${member} تم توثيقه بنجاح`)
            .addFields(
                { name: '🏷️ الرتبة', value: `${targetRole.name}`, inline: true },
                { name: '⏰ الوقت', value: new Date().toLocaleString('ar-SA'), inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // يمكن إرسال هذه الرسالة في قناة منفصلة للإشعارات
        // await someLogChannel.send({ embeds: [logEmbed] });

    } catch (error) {
        console.error('خطأ في معالجة زر التوثيق:', error);
        await interaction.reply({
            content: '❌ حدث خطأ أثناء التوثيق. يرجى المحاولة مرة أخرى.',
            ephemeral: true
        });
    }

    return true;
}

// دالة معالجة أوامر التوثيق
async function handleVerificationCommand(interaction) {
    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'تفعيل-التوثيق':
                // إنشاء رتبة غير موثق
                const unverifiedRole = await createUnverifiedRole(interaction.guild);
                
                // إنشاء قناة التوثيق
                const verificationChannel = await createVerificationChannel(interaction.guild);

                const setupEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ تم تفعيل نظام التوثيق')
                    .setDescription('تم إعداد نظام التوثيق بنجاح!')
                    .addFields(
                        { name: '🏷️ رتبة غير موثق', value: `${unverifiedRole}`, inline: true },
                        { name: '📝 قناة التوثيق', value: `${verificationChannel}`, inline: true },
                        { name: '⚙️ الخطوة التالية', value: 'استخدم أمر `/توثيق` لإرسال رسالة التوثيق', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [setupEmbed] });
                break;

            case 'توثيق':
                if (!verificationChannelId) {
                    await interaction.reply({
                        content: '❌ يجب تفعيل نظام التوثيق أولاً باستخدام `/تفعيل-التوثيق`!',
                        ephemeral: true
                    });
                    return;
                }

                const title = interaction.options.getString('العنوان');
                const description = interaction.options.getString('الوصف');
                const attachment = interaction.options.getAttachment('الصورة');
                const color = interaction.options.getString('لون') || '#0099ff';

                const colorNumber = parseInt(color.replace('#', ''), 16);

                const verificationEmbed = new EmbedBuilder()
                    .setColor(colorNumber)
                    .setTitle(title)
                    .setDescription(description)
                    .setTimestamp();

                if (attachment) {
                    verificationEmbed.setImage(attachment.url);
                }

                const channel = await interaction.client.channels.fetch(verificationChannelId);
                const buttons = createVerificationButtons();

                if (buttons.length === 0) {
                    await interaction.reply({
                        content: '❌ لم يتم إضافة أي أزرار توثيق بعد! استخدم `/إضافة-زر-توثيق` لإضافة أزرار.',
                        ephemeral: true
                    });
                    return;
                }

                const message = await channel.send({
                    embeds: [verificationEmbed],
                    components: buttons
                });

                verificationMessageId = message.id;

                await interaction.reply({
                    content: `✅ تم إرسال رسالة التوثيق في ${channel}`,
                    ephemeral: true
                });
                break;

            case 'إضافة-زر-توثيق':
                const buttonText = interaction.options.getString('نص_الزر');
                const buttonRole = interaction.options.getRole('الرتبة');
                const buttonStyle = interaction.options.getString('نوع_الزر') || 'Primary';
                const buttonEmoji = interaction.options.getString('الإيموجي');

                // التحقق من عدم وجود زر بنفس النص
                const existingButton = Array.from(verificationButtons.values()).find(btn => btn.label === buttonText);
                if (existingButton) {
                    await interaction.reply({
                        content: '❌ يوجد زر بنفس هذا النص بالفعل!',
                        ephemeral: true
                    });
                    return;
                }

                const buttonId = Date.now().toString();
                verificationButtons.set(buttonId, {
                    id: buttonId,
                    label: buttonText,
                    roleId: buttonRole.id,
                    roleName: buttonRole.name,
                    style: buttonStyle,
                    emoji: buttonEmoji
                });

                const addButtonEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ تم إضافة زر التوثيق')
                    .addFields(
                        { name: '📝 نص الزر', value: buttonText, inline: true },
                        { name: '🏷️ الرتبة', value: buttonRole.name, inline: true },
                        { name: '🎨 نوع الزر', value: buttonStyle, inline: true }
                    )
                    .setTimestamp();

                if (buttonEmoji) {
                    addButtonEmbed.addFields({ name: '😀 الإيموجي', value: buttonEmoji, inline: true });
                }

                await interaction.reply({ embeds: [addButtonEmbed] });
                break;

            case 'حذف-زر-توثيق':
                const buttonToDelete = interaction.options.getString('نص_الزر');
                
                let buttonFound = false;
                for (const [id, button] of verificationButtons.entries()) {
                    if (button.label === buttonToDelete) {
                        verificationButtons.delete(id);
                        buttonFound = true;
                        break;
                    }
                }

                if (!buttonFound) {
                    await interaction.reply({
                        content: '❌ لم يتم العثور على زر بهذا النص!',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    content: `✅ تم حذف زر "${buttonToDelete}" بنجاح!`,
                    ephemeral: true
                });
                break;

            case 'عرض-أزرار-التوثيق':
                if (verificationButtons.size === 0) {
                    await interaction.reply({
                        content: '❌ لا توجد أزرار توثيق مضافة!',
                        ephemeral: true
                    });
                    return;
                }

                const buttonsListEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('📋 قائمة أزرار التوثيق')
                    .setDescription(`إجمالي الأزرار: ${verificationButtons.size}`)
                    .setTimestamp();

                let fieldValue = '';
                let fieldCount = 0;
                
                for (const button of verificationButtons.values()) {
                    const buttonInfo = `**${button.label}**\n→ رتبة: ${button.roleName}\n→ نوع: ${button.style}${button.emoji ? `\n→ إيموجي: ${button.emoji}` : ''}\n\n`;
                    
                    if (fieldValue.length + buttonInfo.length > 1024) {
                        buttonsListEmbed.addFields({
                            name: `الأزرار ${fieldCount * 10 + 1}-${fieldCount * 10 + 10}`,
                            value: fieldValue,
                            inline: false
                        });
                        fieldValue = buttonInfo;
                        fieldCount++;
                    } else {
                        fieldValue += buttonInfo;
                    }
                }

                if (fieldValue) {
                    buttonsListEmbed.addFields({
                        name: `الأزرار ${fieldCount * 10 + 1}-${verificationButtons.size}`,
                        value: fieldValue,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [buttonsListEmbed] });
                break;

            case 'تحديث-رسالة-التوثيق':
                if (!verificationChannelId || !verificationMessageId) {
                    await interaction.reply({
                        content: '❌ لا توجد رسالة توثيق لتحديثها!',
                        ephemeral: true
                    });
                    return;
                }

                try {
                    const channel = await interaction.client.channels.fetch(verificationChannelId);
                    const message = await channel.messages.fetch(verificationMessageId);
                    const newButtons = createVerificationButtons();

                    if (newButtons.length === 0) {
                        await interaction.reply({
                            content: '❌ لا توجد أزرار للتحديث!',
                            ephemeral: true
                        });
                        return;
                    }

                    await message.edit({ components: newButtons });
                    
                    await interaction.reply({
                        content: '✅ تم تحديث رسالة التوثيق بنجاح!',
                        ephemeral: true
                    });
                } catch (error) {
                    await interaction.reply({
                        content: '❌ فشل في تحديث رسالة التوثيق!',
                        ephemeral: true
                    });
                }
                break;

            case 'إعطاء-رتبة-غير-موثق':
                if (!unverifiedRoleId) {
                    await interaction.reply({
                        content: '❌ رتبة غير موثق غير موجودة! استخدم `/تفعيل-التوثيق` أولاً.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply();

                const unverifiedRoleToGive = interaction.guild.roles.cache.get(unverifiedRoleId);
                const members = await interaction.guild.members.fetch();
                
                let addedCount = 0;
                let alreadyHadCount = 0;
                let hiddenChannelsCount = 0;

                for (const member of members.values()) {
                    if (member.user.bot) continue;
                    
                    if (!member.roles.cache.has(unverifiedRoleId)) {
                        try {
                            await member.roles.add(unverifiedRoleToGive);
                            // إخفاء الرومات عن العضو
                            await hideChannelsFromMember(member);
                            addedCount++;
                            hiddenChannelsCount++;
                        } catch (error) {
                            console.error(`فشل في إعطاء رتبة غير موثق للعضو ${member.user.tag}:`, error);
                        }
                    } else {
                        alreadyHadCount++;
                    }
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ تم تطبيق رتبة غير موثق')
                    .addFields(
                        { name: '➕ تم إضافتهم', value: `${addedCount} عضو`, inline: true },
                        { name: '✅ يملكونها بالفعل', value: `${alreadyHadCount} عضو`, inline: true },
                        { name: '🔒 تم إخفاء الرومات', value: `${hiddenChannelsCount} عضو`, inline: true },
                        { name: '📊 إجمالي الأعضاء', value: `${members.size} عضو`, inline: false }
                    )
                    .setFooter({ text: 'الآن يمكن للأعضاء رؤية روم التوثيق فقط' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [resultEmbed] });
                break;

            case 'إزالة-التوثيق':
                const targetMember = interaction.options.getUser('العضو');
                const guildMember = await interaction.guild.members.fetch(targetMember.id);

                if (!unverifiedRoleId) {
                    await interaction.reply({
                        content: '❌ نظام التوثيق غير مفعل!',
                        ephemeral: true
                    });
                    return;
                }

                const unverifiedRoleToAdd = interaction.guild.roles.cache.get(unverifiedRoleId);
                
                // إزالة جميع الرتب الأخرى (عدا رتبة الجميع والرتب الأساسية)
                const rolesToRemove = guildMember.roles.cache.filter(role => 
                    role.id !== interaction.guild.id && // ليس رتبة @everyone
                    role.id !== unverifiedRoleId && // ليس رتبة غير موثق
                    !role.managed // ليس رتبة للبوتات
                );

                for (const role of rolesToRemove.values()) {
                    try {
                        await guildMember.roles.remove(role);
                    } catch (error) {
                        console.error(`فشل في إزالة الرتبة ${role.name}:`, error);
                    }
                }

                // إضافة رتبة غير موثق
                try {
                    await guildMember.roles.add(unverifiedRoleToAdd);
                } catch (error) {
                    console.error('فشل في إضافة رتبة غير موثق:', error);
                }

                const removeVerificationEmbed = new EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle('🔄 تم إزالة التوثيق')
                    .setDescription(`تم إزالة توثيق ${targetMember} وإعادته لحالة غير موثق`)
                    .addFields(
                        { name: '👤 العضو', value: `${targetMember.tag}`, inline: true },
                        { name: '🏷️ الرتب المحذوفة', value: `${rolesToRemove.size} رتبة`, inline: true },
                        { name: '👑 بواسطة', value: `${interaction.user.tag}`, inline: true }
                    )
                    .setThumbnail(targetMember.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await interaction.reply({ embeds: [removeVerificationEmbed] });
                break;

            default:
                return false;
        }
        return true;
    } catch (error) {
        console.error('خطأ في نظام التوثيق:', error);
        throw error;
    }
}

// تصدير الوحدة
module.exports = {
    verificationCommands,
    handleVerificationCommand,
    handleNewMember,
    handleVerificationButton
};
