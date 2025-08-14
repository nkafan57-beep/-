
const fs = require('fs').promises;
const path = require('path');

class EventHandler {
    async loadEvents(client) {
        try {
            const eventsPath = path.join(__dirname, '../events');
            
            // التحقق من وجود مجلد الأحداث
            try {
                await fs.access(eventsPath);
            } catch {
                // إنشاء المجلد إذا لم يكن موجود
                await fs.mkdir(eventsPath, { recursive: true });
                console.log('📁 تم إنشاء مجلد الأحداث');
                return;
            }

            const eventFiles = await fs.readdir(eventsPath);
            const jsFiles = eventFiles.filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
                const event = require(path.join(eventsPath, file));
                
                if (event.name && event.execute) {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    
                    console.log(`📅 تم تحميل الحدث: ${event.name}`);
                }
            }

            // تحميل الأحداث من الأنظمة الموجودة
            this.loadSystemEvents(client);

        } catch (error) {
            console.error('❌ خطأ في تحميل الأحداث:', error);
        }
    }

    loadSystemEvents(client) {
        // تحميل أحداث نظام التوثيق
        try {
            const verificationSystem = require('../verification-system');
            client.on('guildMemberAdd', (member) => verificationSystem.handleNewMember(member));
        } catch (error) {
            console.log('⚠️ نظام التوثيق غير متوفر');
        }

        // تحميل أحداث نظام التكتات
        try {
            const ticketSystem = require('../ticket-system');
            client.on('channelCreate', (channel) => ticketSystem.handleChannelCreate(channel));
            ticketSystem.startInactivityMonitoring && ticketSystem.startInactivityMonitoring(client);
        } catch (error) {
            console.log('⚠️ نظام التكتات غير متوفر');
        }

        // تحميل أحداث الحماية
        try {
            const BotProtection = require('../bot-protection');
            const SecurityMonitor = require('../security-monitor');
            
            const protection = new BotProtection(client);
            const securityMonitor = new SecurityMonitor(client, require('./commandHandler').OWNER_ID || '1179133837930938470');
            
            protection.startProtection();
            protection.simulateHumanActivity();
            
            client.protection = protection;
            client.securityMonitor = securityMonitor;
            
            console.log('🛡️ تم تفعيل نظام الحماية');
        } catch (error) {
            console.log('⚠️ نظام الحماية غير متوفر');
        }
    }
}

module.exports = new EventHandler();
