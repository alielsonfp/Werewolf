console.log('🔍 DIAGNÓSTICO HEALTH CHECK');
console.log('===========================');

async function diagnoseHealth() {
    try {
        console.log('📡 Fazendo requisição para /health...');

        const response = await fetch('http://localhost:3001/health');

        console.log(`📊 Status HTTP: ${response.status}`);
        console.log(`📊 Status Text: ${response.statusText}`);

        const data = await response.json();

        console.log('\n📋 ANÁLISE DETALHADA:');
        console.log('====================');

        // Status geral
        console.log(`🏥 Status Geral: ${data.status}`);
        console.log(`🕐 Timestamp: ${data.timestamp}`);

        // Serviço principal
        console.log(`\n🔧 Serviço: ${data.service?.type} (${data.service?.mode})`);

        // Database
        console.log(`\n🗄️ DATABASE:`);
        console.log(`   Status: ${data.database?.status}`);
        console.log(`   Message: ${data.database?.message}`);

        // Redis
        console.log(`\n📦 REDIS:`);
        console.log(`   Status: ${data.redis?.status}`);
        console.log(`   Message: ${data.redis?.message}`);

        // Services (aqui está o problema!)
        console.log(`\n⚙️ SERVICES:`);
        if (data.services) {
            for (const [serviceName, serviceData] of Object.entries(data.services)) {
                console.log(`   ${serviceName}:`);
                console.log(`     Status: ${serviceData.status}`);
                console.log(`     Message: ${serviceData.message}`);

                if (serviceData.status === 'unhealthy') {
                    console.log(`     ❌ PROBLEMA ENCONTRADO EM: ${serviceName}`);
                }
            }
        }

        // Stats
        console.log(`\n📈 STATS:`);
        if (data.stats) {
            for (const [statName, statData] of Object.entries(data.stats)) {
                console.log(`   ${statName}: ${JSON.stringify(statData)}`);
            }
        }

        // Uptime e Memory
        console.log(`\n💻 SISTEMA:`);
        console.log(`   Uptime: ${data.uptime}s`);
        console.log(`   Memory RSS: ${Math.round(data.memory?.rss / 1024 / 1024)}MB`);

        // DIAGNÓSTICO FINAL
        console.log(`\n🎯 DIAGNÓSTICO:`);
        if (response.status === 503) {
            console.log('❌ PROBLEMA: Health check retornando 503');
            console.log('🔍 CAUSA: Um ou mais serviços reportam status unhealthy');

            // Identificar serviços problemáticos
            const unhealthyServices = [];
            if (data.services) {
                for (const [name, service] of Object.entries(data.services)) {
                    if (service.status === 'unhealthy') {
                        unhealthyServices.push(name);
                    }
                }
            }

            if (unhealthyServices.length > 0) {
                console.log(`🎯 SERVIÇOS PROBLEMÁTICOS: ${unhealthyServices.join(', ')}`);
                console.log('💡 SOLUÇÃO: Implementar corretamente esses serviços ou ajustar lógica do health check');
            }
        } else {
            console.log('✅ HEALTH CHECK OK - Status 200');
        }

    } catch (error) {
        console.log('❌ ERRO AO FAZER DIAGNÓSTICO:', error.message);
    }
}

diagnoseHealth();