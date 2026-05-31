
import axios from 'axios';

async function testApi() {
    const API_URL = 'https://www.datos.gov.co/resource/4hyg-wa9d.json';
    const normMun = 'CALI';
    const normEvent = 'TUBERCULOSIS';

    try {
        console.log(`Consultando API SIVIGILA Valle para: ${normEvent} en ${normMun}`);

        const response = await axios.get(API_URL, {
            params: {
                municipio_ocurrencia: normMun,
                ano: '2020',
                $where: `nombre_evento like '%${normEvent}%'`,
            },
        });

        console.log('API Response data length:', response.data.length);
        console.log('Sample data:', JSON.stringify(response.data.slice(0, 2), null, 2));

        const totalCases = response.data.reduce((sum: number, item: any) => sum + parseInt(item.conteo || '0', 10), 0);
        console.log('Total cases:', totalCases);
    } catch (error: any) {
        console.error(`Error consultando API: ${error.message}`);
    }
}

testApi();
