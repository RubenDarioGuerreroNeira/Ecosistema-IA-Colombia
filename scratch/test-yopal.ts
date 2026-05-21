import { YopalHealthService } from '../src/bot/yopal-health.service';

async function test() {
  const service = new YopalHealthService();
  console.log('Initializing service...');
  await service.onModuleInit();
  
  const summary = service.getKnowledgeSummary();
  console.log('Knowledge Summary:', summary);

  const municipios = service.getMunicipios();
  console.log('Municipios:', municipios);

  console.log('\nSearching for "capresoca":');
  const capresoca = service.searchProviders('capresoca');
  console.log(JSON.stringify(capresoca, null, 2));

  console.log('\nSearching for "coomeva":');
  const coomeva = service.searchProviders('coomeva');
  console.log(JSON.stringify(coomeva, null, 2));
}

test().catch(console.error);
