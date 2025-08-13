
const { EmbedBuilder } = require('discord.js');

class SecurityMonitor {
    constructor(client, ownerId) {
        this.client = client;
        this.ownerId = ownerId;
        this.performanceMetrics = {
            messagesSent: 0,
            commandsExecuted: 0,
            errorsEncountered: 0,
            memoryUsage: 0,
            uptime: 0
        };
        this.securityAlerts = [];
        this.startMonitoring();
    }

    startMonitoring() {
        // مراقبة الأداء كل 5 دقائق
        setInterval(() => {
            this.checkPerformance();
        }, 300000);

        // تقرير أمني يومي
        setInterval(() => {
            this.sendDailyReport();
        }, 86400000);

        console.log('🔍 تم تشغيل نظام المراقبة الأمنية');
    }

    checkPerformance() {
        const memUsage = process.memoryUsage();
        this.performanceMetrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
        this.performanceMetrics.uptime = process.uptime();

        // إنذار إذا كان استهلاك الذاكرة عالي
        if (this.performanceMetrics.memoryUsage > 500) {
            this.logSecurityAlert('عالي', 'استهلاك ذاكرة مرتفع', `${this.performanceMetrics.memoryUsage.toFixed(2)} MB`);
        }

        console.log(`📊 إحصائيات الأداء: ذاكرة ${this.performanceMetrics.memoryUsage.toFixed(2)}MB | وقت التشغيل ${Math.floor(this.performanceMetrics.uptime / 3600)}h`);
    }

    logSecurityAlert(level, type, details) {
        const alert = {
            timestamp: new Date(),
            level,
            type,
            details
        };
        
        this.securityAlerts.push(alert);
        
        // الاحتفاظ بآخر 100 تنبيه فقط
        if (this.securityAlerts.length > 100) {
            this.securityAlerts.shift();
        }

        console.log(`🚨 ${level}: ${type} - ${details}`);
    }

    async sendDailyReport() {
        try {
            const owner = await this.client.users.fetch(this.ownerId);
            
            const reportEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📋 التقرير الأمني اليومي')
                .addFields(
                    { name: '📈 الأداء', value: `الذاكرة: ${this.performanceMetrics.memoryUsage.toFixed(2)}MB\nوقت التشغيل: ${Math.floor(this.performanceMetrics.uptime / 3600)}h`, inline: true },
                    { name: '⚡ النشاط', value: `الرسائل: ${this.performanceMetrics.messagesSent}\nالأوامر: ${this.performanceMetrics.commandsExecuted}`, inline: true },
                    { name: '🚨 التنبيهات', value: `إجمالي: ${this.securityAlerts.length}\nعالية: ${this.securityAlerts.filter(a => a.level === 'عالي').length}`, inline: true }
                )
                .setTimestamp();

            await owner.send({ embeds: [reportEmbed] });
        } catch (error) {
            console.error('خطأ في إرسال التقرير اليومي:', error);
        }
    }

    recordActivity(type) {
        switch(type) {
            case 'message':
                this.performanceMetrics.messagesSent++;
                break;
            case 'command':
                this.performanceMetrics.commandsExecuted++;
                break;
            case 'error':
                this.performanceMetrics.errorsEncountered++;
                break;
        }
    }

    // دالة للحصول على إحصائيات مفصلة
    getDetailedStats() {
        return {
            ...this.performanceMetrics,
            recentAlerts: this.securityAlerts.slice(-10),
            status: this.performanceMetrics.memoryUsage > 500 ? 'تحذير' : 'طبيعي'
        };
    }
}

module.exports = SecurityMonitor;
