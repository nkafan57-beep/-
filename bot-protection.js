
const { PermissionFlagsBits } = require('discord.js');

// نظام حماية البوت من الاكتشاف المتقدم
class BotProtection {
    constructor(client) {
        this.client = client;
        this.protectedServers = new Set();
        this.humanLikeActivities = [
            { name: 'Spotify', type: 2 },
            { name: 'YouTube', type: 3 },
            { name: 'Netflix', type: 3 },
            { name: 'Instagram', type: 0 },
            { name: 'WhatsApp', type: 0 },
            { name: 'فيس بوك', type: 0 },
            { name: 'تيك توك', type: 3 },
            { name: 'سناب شات', type: 0 },
            null, null, null // فترات بدون حالة أطول
        ];
        this.currentActivityIndex = 0;
        this.typingChannels = new Set();
        this.lastMessageTimes = new Map();
        this.humanDelays = new Map();
    }

    // بدء أنظمة الحماية المتقدمة
    startProtection() {
        this.rotateActivity();
        this.setupGuildJoinProtection();
        this.setupAntiDetection();
        this.simulateTyping();
        this.randomStatusChanges();
        this.hideFromMemberList();
        this.interceptMessages();
    }

    // دوران الحالة بشكل بشري أكثر
    rotateActivity() {
        setInterval(() => {
            const activity = this.humanLikeActivities[this.currentActivityIndex];
            const statuses = ['online', 'idle', 'dnd', 'invisible'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            if (activity && Math.random() > 0.4) { // 60% احتمال وجود نشاط
                this.client.user.setPresence({
                    activities: [activity],
                    status: randomStatus
                });
            } else {
                // بدون حالة لفترات طويلة (محاكاة الإنسان)
                this.client.user.setPresence({
                    activities: [],
                    status: Math.random() > 0.3 ? 'invisible' : randomStatus
                });
            }

            this.currentActivityIndex = (this.currentActivityIndex + 1) % this.humanLikeActivities.length;
        }, Math.random() * 600000 + 300000); // كل 5-15 دقيقة
    }

    // حماية عند دخول سيرفر جديد
    setupGuildJoinProtection() {
        this.client.on('guildCreate', async (guild) => {
            try {
                // تأخير طويل جداً قبل أي نشاط (3-10 دقائق)
                await this.randomDelay(180000, 600000);
                
                // فحص شامل للبوتات الأمنية أولاً
                const hasSecurityBots = await this.detectAndAvoidSecurityBots(guild);
                
                if (hasSecurityBots) {
                    // وضع التخفي الكامل
                    await this.activateStealthMode();
                    
                    // تأخير إضافي أطول
                    await this.randomDelay(300000, 900000); // 5-15 دقيقة إضافية
                }
                
                // تغيير الاسم المستعار تدريجياً
                await this.gradualNicknameChange(guild);
                
                // محاكاة سلوك إنسان جديد في السيرفر
                await this.simulateNewUserBehavior(guild);
                
                this.protectedServers.add(guild.id);
                console.log(`تم تطبيق الحماية المتقدمة على السيرفر: ${guild.name}`);
            } catch (error) {
                console.error('خطأ في تطبيق الحماية:', error);
                // في حالة الخطأ، تفعيل وضع الطوارئ
                await this.emergencyStealthMode();
            }
        });
    }

    // نظام مضاد للاكتشاف
    setupAntiDetection() {
        // تأخير عشوائي في الردود
        const originalReply = this.client.ws.send;
        this.client.ws.send = function(data) {
            // تأخير عشوائي قصير للرسائل
            setTimeout(() => {
                originalReply.call(this, data);
            }, Math.random() * 100 + 50);
        };

        // تجاهل بعض الرسائل عشوائياً (محاكاة الإنسان)
        this.client.on('messageCreate', (message) => {
            if (message.author.bot && Math.random() < 0.1) {
                // تجاهل 10% من رسائل البوتات عشوائياً
                return;
            }
        });
    }

    // تأخير عشوائي
    async randomDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // تغيير الاسم المستعار عشوائياً
    async setRandomNickname(guild) {
        try {
            const nicknames = [
                'Ahmed', 'Omar', 'Sarah', 'Fatima', 'Khalid',
                'Layla', 'Hassan', 'Noor', 'Zain', 'Maryam',
                'عبدالله', 'فاطمة', 'محمد', 'نور', 'سارة'
            ];
            
            const randomNick = nicknames[Math.floor(Math.random() * nicknames.length)];
            const member = await guild.members.fetch(this.client.user.id);
            
            if (member.manageable) {
                await member.setNickname(randomNick);
            }
        } catch (error) {
            // تجاهل الأخطاء بصمت
        }
    }

    // محاكاة نشاط بشري
    simulateHumanActivity() {
        setInterval(async () => {
            if (Math.random() < 0.3) { // 30% احتمال
                // تغيير الحالة أحياناً
                const statuses = ['online', 'idle', 'dnd'];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                await this.client.user.setPresence({
                    status: randomStatus
                });

                // العودة للحالة العادية بعد فترة
                setTimeout(async () => {
                    await this.client.user.setPresence({
                        status: 'online'
                    });
                }, Math.random() * 120000 + 60000);
            }
        }, Math.random() * 600000 + 300000); // كل 5-15 دقيقة
    }

    // إخفاء معلومات البوت
    hideApplicationInfo() {
        // تعديل معلومات التطبيق إذا أمكن
        if (this.client.application) {
            Object.defineProperty(this.client.application, 'botPublic', {
                value: false,
                writable: false
            });
        }
    }

    // تشفير بيانات التخزين المؤقت
    encryptCacheData() {
        // محاولة إخفاء البيانات المخزنة
        const originalSet = Map.prototype.set;
        Map.prototype.set = function(key, value) {
            if (typeof value === 'object' && value.bot !== undefined) {
                value._protected = true;
            }
            return originalSet.call(this, key, value);
        };
    }

    // فحص وجود بوتات أمنية معروفة
    async checkForSecurityBots(guild) {
        try {
            const members = await guild.members.fetch();
            const suspiciousBots = [
                'carl-bot', 'dyno', 'mee6', 'arcane', 'ticket-tool',
                'statbot', 'serverstat', 'security', 'antinuke'
            ];

            for (const [id, member] of members) {
                if (member.user.bot) {
                    const username = member.user.username.toLowerCase();
                    if (suspiciousBots.some(bot => username.includes(bot))) {
                        console.log(`تم اكتشاف بوت أمني محتمل: ${member.user.tag}`);
                        // يمكن إضافة إجراءات إضافية هنا
                    }
                }
            }
        } catch (error) {
            // تجاهل الأخطاء
        }
    }

    // محاكاة كتابة بشرية عشوائية
    simulateTyping() {
        setInterval(async () => {
            if (Math.random() < 0.05) { // 5% احتمال
                const guilds = this.client.guilds.cache;
                if (guilds.size === 0) return;
                
                const randomGuild = guilds.random();
                const textChannels = randomGuild.channels.cache.filter(c => c.type === 0);
                if (textChannels.size === 0) return;
                
                const randomChannel = textChannels.random();
                
                try {
                    await randomChannel.sendTyping();
                    // توقف الكتابة بعد وقت عشوائي (محاكاة بشرية)
                    setTimeout(() => {
                        // لا نرسل شيئاً، مجرد توقف
                    }, Math.random() * 8000 + 2000);
                } catch (error) {
                    // تجاهل الأخطاء
                }
            }
        }, Math.random() * 120000 + 60000); // كل 1-3 دقائق
    }

    // تغييرات عشوائية في الحالة
    randomStatusChanges() {
        setInterval(async () => {
            if (Math.random() < 0.2) { // 20% احتمال
                const statuses = ['online', 'idle', 'dnd', 'invisible'];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                await this.client.user.setPresence({
                    status: randomStatus
                });

                // العودة بعد فترة عشوائية
                setTimeout(async () => {
                    await this.client.user.setPresence({
                        status: 'online'
                    });
                }, Math.random() * 180000 + 60000);
            }
        }, Math.random() * 300000 + 180000);
    }

    // إخفاء من قائمة الأعضاء
    hideFromMemberList() {
        setInterval(async () => {
            try {
                await this.client.user.setPresence({
                    status: 'invisible'
                });

                setTimeout(async () => {
                    await this.client.user.setPresence({
                        status: 'online'
                    });
                }, Math.random() * 300000 + 120000); // مخفي لمدة 2-7 دقائق
            } catch (error) {
                // تجاهل الأخطاء
            }
        }, Math.random() * 1800000 + 600000); // كل 10-40 دقيقة
    }

    // اعتراض وتأخير الرسائل
    interceptMessages() {
        // تأخيرات بشرية في الرد
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || message.author.id === this.client.user.id) return;
            
            // حفظ وقت آخر رسالة
            this.lastMessageTimes.set(message.channel.id, Date.now());
            
            // تأخير عشوائي قبل أي استجابة (محاكاة قراءة الرسالة)
            const readingDelay = Math.random() * 5000 + 1000; // 1-6 ثواني
            this.humanDelays.set(message.channel.id, readingDelay);
        });
    }

    // تنظيف آثار النشاط المتقدم
    cleanupTraces() {
        setInterval(() => {
            // مسح console logs بشكل عشوائي
            if (Math.random() < 0.05) {
                try {
                    console.clear();
                } catch (e) {
                    // تجاهل الأخطاء
                }
            }

            // تنظيف الذاكرة
            if (this.client.channels.cache.size > 2000) {
                const channels = Array.from(this.client.channels.cache.keys());
                const toDelete = channels.slice(0, Math.floor(channels.length * 0.05));
                toDelete.forEach(id => this.client.channels.cache.delete(id));
            }

            // مسح البيانات القديمة
            this.lastMessageTimes.clear();
            this.humanDelays.clear();
            
        }, 600000); // كل 10 دقائق
    }
// إخفاء علامات البوت من الـ API
    maskBotIdentity() {
        // تعديل user agent
        if (this.client.options && this.client.options.http) {
            this.client.options.http.headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
        }

        // إخفاء معلومات التطبيق
        Object.defineProperty(this.client, 'application', {
            get() {
                return null;
            },
            configurable: true
        });
    }

    // محاكاة سلوك بشري في التفاعل
    async humanLikeResponse(channel, delay = null) {
        const responseDelay = delay || this.humanDelays.get(channel.id) || Math.random() * 3000 + 500;
        
        // محاكاة كتابة
        try {
            await channel.sendTyping();
            
            // تأخير إضافي (وقت الكتابة)
            await new Promise(resolve => setTimeout(resolve, responseDelay));
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // التحقق من وجود بوتات مراقبة وإخفاء النشاط
    async detectAndAvoidSecurityBots(guild) {
        try {
            const members = await guild.members.fetch();
            const securityBots = [
                'wick', 'security', 'antinuke', 'carl-bot', 'dyno', 
                'mee6', 'arcane', 'ticket', 'log', 'audit', 'mod',
                'guardian', 'shield', 'protect', 'watch', 'monitor'
            ];

            let hasSecurityBot = false;
            
            for (const [id, member] of members) {
                if (member.user.bot) {
                    const username = member.user.username.toLowerCase();
                    if (securityBots.some(bot => username.includes(bot))) {
                        hasSecurityBot = true;
                        console.log(`تم اكتشاف بوت أمني: ${member.user.tag}`);
                    }
                }
            }

            if (hasSecurityBot) {
                // تفعيل وضع الإخفاء الكامل
                await this.client.user.setPresence({
                    status: 'invisible'
                });
                
                // تأخيرات أطول في الاستجابة
                this.humanDelays.set(guild.id, Math.random() * 15000 + 5000);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('خطأ في فحص البوتات الأمنية:', error);
            return false;
        }
    }

    // وضع التخفي الكامل
    async activateStealthMode() {
        try {
            // إخفاء الحالة تماماً
            await this.client.user.setPresence({
                activities: [],
                status: 'invisible'
            });
            
            // إيقاف جميع الأنشطة المشبوهة مؤقتاً
            this.stealthModeActive = true;
            
            // تعطيل الردود التلقائية
            this.client.removeAllListeners('messageCreate');
            
            console.log('تم تفعيل وضع التخفي الكامل');
        } catch (error) {
            console.error('خطأ في تفعيل وضع التخفي:', error);
        }
    }
    
    // وضع الطوارئ
    async emergencyStealthMode() {
        try {
            await this.client.user.setPresence({
                status: 'invisible'
            });
            
            // تجميد جميع الأنشطة
            this.client.removeAllListeners();
            
            console.log('تم تفعيل وضع الطوارئ');
        } catch (error) {
            console.error('خطأ في وضع الطوارئ:', error);
        }
    }
    
    // محاكاة سلوك المستخدم الجديد
    async simulateNewUserBehavior(guild) {
        try {
            // عدم فعل أي شيء لفترة طويلة (محاكاة قراءة القواعد)
            await this.randomDelay(600000, 1200000); // 10-20 دقيقة
            
            // تغيير الحالة تدريجياً
            setTimeout(async () => {
                await this.client.user.setPresence({
                    status: 'idle'
                });
            }, Math.random() * 300000 + 300000);
            
            // تفاعل خفيف جداً
            setTimeout(async () => {
                await this.client.user.setPresence({
                    status: 'online'
                });
            }, Math.random() * 600000 + 600000);
            
        } catch (error) {
            console.error('خطأ في محاكاة السلوك:', error);
        }
    }
    
    // تغيير الاسم تدريجياً
    async gradualNicknameChange(guild) {
        try {
            await this.randomDelay(900000, 1800000); // انتظار 15-30 دقيقة
            
            const member = await guild.members.fetch(this.client.user.id);
            if (member.manageable) {
                const nicknames = [
                    null, // بدون اسم مستعار
                    'Ahmed', 'Omar', 'Sarah', 'Khalid', 'Noor',
                    'عبدالله', 'فاطمة', 'محمد', 'نور', 'سارة'
                ];
                
                const randomNick = nicknames[Math.floor(Math.random() * nicknames.length)];
                await member.setNickname(randomNick);
            }
        } catch (error) {
            // تجاهل الأخطاء بصمت
        }
    }
    
    // كشف متقدم للبوتات الأمنية
    async detectAndAvoidSecurityBots(guild) {
        try {
            const members = await guild.members.fetch();
            const dangerousBots = [
                // بوتات الحماية المعروفة
                'wick', 'security', 'antinuke', 'carl-bot', 'dyno', 
                'mee6', 'arcane', 'ticket', 'log', 'audit', 'mod',
                'guardian', 'shield', 'protect', 'watch', 'monitor',
                'safe', 'defend', 'anti', 'guard', 'secure',
                'firewall', 'sentinel', 'watchdog', 'defender',
                'automod', 'moderation', 'admin', 'staff'
            ];
            
            let detectedBots = [];
            
            for (const [id, member] of members) {
                if (member.user.bot) {
                    const username = member.user.username.toLowerCase();
                    const hasPermissions = member.permissions.has(['BanMembers', 'KickMembers', 'ManageGuild']);
                    
                    // فحص اسم البوت
                    const isDangerous = dangerousBots.some(bot => 
                        username.includes(bot) || 
                        member.displayName.toLowerCase().includes(bot)
                    );
                    
                    if (isDangerous || hasPermissions) {
                        detectedBots.push({
                            name: member.user.tag,
                            id: member.id,
                            permissions: hasPermissions
                        });
                    }
                }
            }
            
            if (detectedBots.length > 0) {
                console.log(`تم اكتشاف ${detectedBots.length} بوت أمني خطير:`, detectedBots);
                
                // تفعيل الإجراءات المضادة القوية
                await this.activateCounterMeasures(guild, detectedBots);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('خطأ في كشف البوتات الأمنية:', error);
            return true; // افتراض وجود خطر في حالة الخطأ
        }
    }
    
    // تفعيل الإجراءات المضادة
    async activateCounterMeasures(guild, detectedBots) {
        try {
            console.log('تفعيل الإجراءات المضادة المتقدمة...');
            
            // إخفاء كامل فوري
            await this.client.user.setPresence({
                activities: [],
                status: 'invisible'
            });
            
            // تعطيل جميع الوظائف المشبوهة
            this.stealthModeActive = true;
            
            // تأخيرات طويلة جداً في أي نشاط
            this.humanDelays.set(guild.id, Math.random() * 30000 + 10000);
            
            // محاولة تمويه الهوية
            await this.disguiseIdentity();
            
        } catch (error) {
            console.error('خطأ في الإجراءات المضادة:', error);
        }
    }
    
    // تمويه الهوية
    async disguiseIdentity() {
        try {
            // تعديل User-Agent وHeaders
            if (this.client.options && this.client.options.http) {
                this.client.options.http.headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate'
                };
            }
            
            // إخفاء معلومات البوت من API calls
            const originalFetch = this.client.rest.request;
            this.client.rest.request = function(options) {
                // تأخير عشوائي في كل طلب
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(originalFetch.call(this, options));
                    }, Math.random() * 1000 + 500);
                });
            };
            
        } catch (error) {
            console.error('خطأ في تمويه الهوية:', error);
        }
    }
    
    // الحصول على تأخير بشري للرد
    getHumanDelay(channelId) {
        if (this.stealthModeActive) {
            return Math.random() * 15000 + 5000; // تأخير أطول في وضع التخفي
        }
        return this.humanDelays.get(channelId) || Math.random() * 2000 + 500;
    }
}

module.exports = BotProtection;
