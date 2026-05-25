// ═══════════════════════════════════════════════════
// NTZ PCBooster Landing — i18n (PT/EN/ES)
// ═══════════════════════════════════════════════════

const LANDING_LOCALES = {
  pt: {
    // Nav
    'nav.features': 'Recursos',
    'nav.pricing': 'Planos',
    'nav.faq': 'FAQ',
    'nav.buy': 'Comprar',

    // Hero
    'hero.badge': '50+ otimizacoes automaticas',
    'hero.title': 'Seu PC no <span class="text-accent">maximo</span><br/>desempenho para jogos',
    'hero.sub': 'NTZ PCBooster aplica 50+ otimizacoes no Windows com um clique. Mais FPS, menos input lag, sem complicacao tecnica.',
    'hero.cta': 'Otimizar meu PC',
    'hero.cta2': 'Ver recursos',
    'hero.stat1': 'Otimizacoes',
    'hero.stat2': 'Pra aplicar tudo',
    'hero.stat3': 'Reversivel',

    // Features
    'feat.badge': 'RECURSOS',
    'feat.title': 'Tudo que voce precisa para<br/><span class="text-accent">maximizar</span> seu desempenho',
    'feat.1.title': 'Game Boost',
    'feat.1.desc': '27 otimizacoes focadas em jogos: GPU no maximo desempenho, Nagle desativado, Game Mode otimizado, HPET desabilitado e muito mais.',
    'feat.2.title': 'Limpeza Inteligente',
    'feat.2.desc': 'Remove bloatware, limpa caches do sistema, shaders e navegadores. Desativa telemetria e servicos desnecessarios.',
    'feat.3.title': 'Tweaks de Sistema',
    'feat.3.desc': 'Menu de contexto classico, icones da bandeja, efeitos visuais otimizados, Bing removido da busca. Tudo reversivel.',
    'feat.4.title': 'Seguro e Reversivel',
    'feat.4.desc': 'Cada otimizacao pode ser desfeita individualmente. Nada e permanente — voce tem controle total do seu sistema.',
    'feat.5.title': 'Bloatware Seletivo',
    'feat.5.desc': 'Escolha exatamente quais apps pre-instalados remover. Xbox, Cortana, OneDrive — voce decide o que fica e o que sai.',
    'feat.6.title': 'Vinculado ao Hardware',
    'feat.6.desc': 'Licenca vinculada a sua placa-mae. Reinstalou o Windows? Ativa de novo com a mesma chave, sem burocracia.',

    // How it works
    'how.badge': 'COMO FUNCIONA',
    'how.title': 'Tres passos. <span class="text-accent">Sem complicacao.</span>',
    'how.1.title': 'Compre sua licenca',
    'how.1.desc': 'Escolha o plano e receba sua chave por email em segundos.',
    'how.2.title': 'Ative o NTZ PCBooster',
    'how.2.desc': 'Baixe o app, insira a chave e vincule ao seu PC.',
    'how.3.title': 'Otimize com 1 click',
    'how.3.desc': 'Aplique todas as otimizacoes de uma vez ou escolha individualmente.',

    // Pricing
    'price.badge': 'PLANOS',
    'price.title': 'Investimento que <span class="text-accent">se paga</span>',
    'price.sub': 'Chave entregue por email imediatamente apos o pagamento',
    'price.couponLabel': 'TEM CUPOM?',
    'price.couponBtn': 'Aplicar',
    'price.couponPlaceholder': 'CODIGO',
    'price.redeemTitle': '<i class="ph ph-gift"></i> Resgate gratuito',
    'price.redeemDesc': 'Cupom 100% aplicado! Digite seu email para receber a chave:',
    'price.redeemBtn': 'Resgatar gratis',
    'price.monthly': 'Mensal',
    'price.monthlyDesc': 'Para quem quer testar',
    'price.monthlyPeriod': '/mes',
    'price.annual': 'Anual',
    'price.annualDesc': 'Melhor custo-beneficio',
    'price.annualPeriod': '/ano',
    'price.popular': 'MAIS POPULAR',
    'price.feat1': '53 otimizacoes',
    'price.feat2': 'Atualizacoes incluidas',
    'price.feat3m': 'Suporte por email',
    'price.feat3a': 'Suporte prioritario',
    'price.feat4m': 'Cancele quando quiser',
    'price.feat4a': 'Economia de 50%',
    'price.feat5': 'Reinstale quantas vezes quiser',
    'price.btnMonthly': 'Assinar mensal',
    'price.btnAnnual': 'Assinar anual',
    'price.guarantee': 'Garantia de 14 dias. Nao gostou? Devolucao total, sem perguntas.',

    // FAQ
    'faq.badge': 'FAQ',
    'faq.title': 'Perguntas frequentes',
    'faq.q1': 'O NTZ PCBooster e seguro? Vai estragar meu PC?',
    'faq.a1': '100% seguro. Todas as otimizacoes sao reversiveis — cada ajuste pode ser desfeito individualmente com um clique. Nenhuma alteracao e permanente.',
    'faq.q2': 'Funciona no Windows 10 e 11?',
    'faq.a2': 'Sim, funciona em ambos. Algumas otimizacoes especificas indicam quando sao exclusivas de uma versao.',
    'faq.q3': 'Posso usar em mais de um PC?',
    'faq.a3': 'Cada licenca e vinculada a uma placa-mae. Se trocar de PC, entre em contato com o suporte para transferir sua licenca gratuitamente.',
    'faq.q4': 'Quanto de FPS vou ganhar?',
    'faq.a4': 'O ganho varia conforme seu hardware e jogos. As otimizacoes removem gargalos do Windows que consomem recursos desnecessariamente, liberando mais performance para os jogos.',
    'faq.q5': 'Como recebo minha chave?',
    'faq.a5': 'Imediatamente apos o pagamento, sua chave e enviada para o email usado na compra. Basta abrir o NTZ PCBooster e inserir a chave.',
    'faq.q6': 'E se eu reinstalar o Windows?',
    'faq.a6': 'Sem problema. Baixe o NTZ PCBooster novamente e use a mesma chave. Como a licenca esta vinculada a sua placa-mae, ativa automaticamente.',
    'faq.q7': 'Qual a politica de reembolso?',
    'faq.a7': 'Voce tem 14 dias para pedir reembolso total, sem perguntas. Basta enviar um email para suporte@pcboost.com.br.',
    'faq.q8': 'Preciso de conhecimento tecnico?',
    'faq.a8': 'Nao. O NTZ PCBooster e feito para ser simples. Um clique aplica todas as otimizacoes. Voce pode tambem escolher individualmente quais ajustes quer fazer.',

    // CTA Final
    'cta.title': 'Pronto para <span class="text-accent">turbinar</span> seu PC?',
    'cta.sub': 'Junte-se a quem ja otimizou seu Windows com o NTZ PCBooster.',
    'cta.btn': 'Comecar agora',

    // Footer
    'footer.copy': '&copy; 2026 NTZ PCBooster. Todos os direitos reservados.',

    // Success page
    'success.title': 'Compra confirmada!',
    'success.sub': 'Sua chave de ativacao foi enviada para o email usado na compra.<br/>Verifique sua caixa de entrada (e o spam).',
    'success.stepsTitle': 'PROXIMOS PASSOS',
    'success.step1': 'Baixe o NTZ PCBooster clicando no botao abaixo',
    'success.step2': 'Abra o instalador e siga as instrucoes de instalacao',
    'success.step3': 'No app, clique em "Ativar licenca" e cole a chave que voce recebeu por email',
    'success.step4': 'Aproveite seu PC otimizado!',
    'success.download': 'Baixar NTZ PCBooster',
    'success.note': '<i class="ph ph-info"></i> Compativel com Windows 10 e 11. Sua licenca esta vinculada a sua placa-mae — reinstale quantas vezes quiser.<br/><br/><i class="ph ph-shield-check"></i> <strong style="color:var(--text-dim);">Nota:</strong> O Windows pode exibir um aviso de "app desconhecido" ao abrir o instalador. Clique em <strong style="color:#fff;">"Mais informacoes"</strong> e depois <strong style="color:#fff;">"Executar assim mesmo"</strong>. Isso e normal para apps novos.<br/><br/>Duvidas? <a href="mailto:suporte@ntzpcbooster.com">suporte@ntzpcbooster.com</a>',
  },

  en: {
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.buy': 'Buy',

    'hero.badge': '50+ automatic optimizations',
    'hero.title': 'Your PC at <span class="text-accent">peak</span><br/>gaming performance',
    'hero.sub': 'NTZ PCBooster applies 50+ Windows optimizations with one click. More FPS, less input lag, no technical hassle.',
    'hero.cta': 'Optimize my PC',
    'hero.cta2': 'See features',
    'hero.stat1': 'Optimizations',
    'hero.stat2': 'To apply all',
    'hero.stat3': 'Reversible',

    'feat.badge': 'FEATURES',
    'feat.title': 'Everything you need to<br/><span class="text-accent">maximize</span> your performance',
    'feat.1.title': 'Game Boost',
    'feat.1.desc': '27 gaming-focused optimizations: max GPU performance, Nagle disabled, Game Mode optimized, HPET disabled and much more.',
    'feat.2.title': 'Smart Cleanup',
    'feat.2.desc': 'Removes bloatware, cleans system caches, shaders and browsers. Disables telemetry and unnecessary services.',
    'feat.3.title': 'System Tweaks',
    'feat.3.desc': 'Classic context menu, tray icons, optimized visual effects, Bing removed from search. All reversible.',
    'feat.4.title': 'Safe & Reversible',
    'feat.4.desc': 'Every optimization can be undone individually. Nothing is permanent — you have full control of your system.',
    'feat.5.title': 'Selective Bloatware',
    'feat.5.desc': 'Choose exactly which pre-installed apps to remove. Xbox, Cortana, OneDrive — you decide what stays and what goes.',
    'feat.6.title': 'Hardware-Linked',
    'feat.6.desc': 'License linked to your motherboard. Reinstalled Windows? Activate again with the same key, no hassle.',

    'how.badge': 'HOW IT WORKS',
    'how.title': 'Three steps. <span class="text-accent">No hassle.</span>',
    'how.1.title': 'Buy your license',
    'how.1.desc': 'Choose a plan and receive your key by email in seconds.',
    'how.2.title': 'Activate NTZ PCBooster',
    'how.2.desc': 'Download the app, enter your key and link it to your PC.',
    'how.3.title': 'Optimize with 1 click',
    'how.3.desc': 'Apply all optimizations at once or choose individually.',

    'price.badge': 'PRICING',
    'price.title': 'An investment that <span class="text-accent">pays off</span>',
    'price.sub': 'Key delivered by email immediately after payment',
    'price.couponLabel': 'GOT A COUPON?',
    'price.couponBtn': 'Apply',
    'price.couponPlaceholder': 'CODE',
    'price.redeemTitle': '<i class="ph ph-gift"></i> Free redeem',
    'price.redeemDesc': '100% coupon applied! Enter your email to receive the key:',
    'price.redeemBtn': 'Redeem free',
    'price.monthly': 'Monthly',
    'price.monthlyDesc': 'For those who want to try',
    'price.monthlyPeriod': '/month',
    'price.annual': 'Annual',
    'price.annualDesc': 'Best value',
    'price.annualPeriod': '/year',
    'price.popular': 'MOST POPULAR',
    'price.feat1': '53 optimizations',
    'price.feat2': 'Updates included',
    'price.feat3m': 'Email support',
    'price.feat3a': 'Priority support',
    'price.feat4m': 'Cancel anytime',
    'price.feat4a': '50% savings',
    'price.feat5': 'Reinstall as many times as you want',
    'price.btnMonthly': 'Subscribe monthly',
    'price.btnAnnual': 'Subscribe annual',
    'price.guarantee': '14-day guarantee. Not satisfied? Full refund, no questions asked.',

    'faq.badge': 'FAQ',
    'faq.title': 'Frequently asked questions',
    'faq.q1': 'Is NTZ PCBooster safe? Will it break my PC?',
    'faq.a1': '100% safe. All optimizations are reversible — each tweak can be undone individually with one click. No changes are permanent.',
    'faq.q2': 'Does it work on Windows 10 and 11?',
    'faq.a2': 'Yes, it works on both. Some specific optimizations indicate when they are exclusive to one version.',
    'faq.q3': 'Can I use it on more than one PC?',
    'faq.a3': 'Each license is linked to one motherboard. If you switch PCs, contact support to transfer your license for free.',
    'faq.q4': 'How much FPS will I gain?',
    'faq.a4': 'Gains vary depending on your hardware and games. The optimizations remove Windows bottlenecks that consume resources unnecessarily, freeing more performance for games.',
    'faq.q5': 'How do I receive my key?',
    'faq.a5': 'Immediately after payment, your key is sent to the email used in the purchase. Just open NTZ PCBooster and enter the key.',
    'faq.q6': 'What if I reinstall Windows?',
    'faq.a6': 'No problem. Download NTZ PCBooster again and use the same key. Since the license is linked to your motherboard, it activates automatically.',
    'faq.q7': 'What is the refund policy?',
    'faq.a7': 'You have 14 days to request a full refund, no questions asked. Just send an email to suporte@pcboost.com.br.',
    'faq.q8': 'Do I need technical knowledge?',
    'faq.a8': 'No. NTZ PCBooster is designed to be simple. One click applies all optimizations. You can also choose individually which tweaks you want.',

    'cta.title': 'Ready to <span class="text-accent">supercharge</span> your PC?',
    'cta.sub': 'Join those who already optimized their Windows with NTZ PCBooster.',
    'cta.btn': 'Get started',

    'footer.copy': '&copy; 2026 NTZ PCBooster. All rights reserved.',

    'success.title': 'Purchase confirmed!',
    'success.sub': 'Your activation key has been sent to the email used in the purchase.<br/>Check your inbox (and spam folder).',
    'success.stepsTitle': 'NEXT STEPS',
    'success.step1': 'Download NTZ PCBooster by clicking the button below',
    'success.step2': 'Open the installer and follow the installation instructions',
    'success.step3': 'In the app, click "Activate license" and paste the key you received by email',
    'success.step4': 'Enjoy your optimized PC!',
    'success.download': 'Download NTZ PCBooster',
    'success.note': '<i class="ph ph-info"></i> Compatible with Windows 10 and 11. Your license is linked to your motherboard — reinstall as many times as you want.<br/><br/><i class="ph ph-shield-check"></i> <strong style="color:var(--text-dim);">Note:</strong> Windows may show an "unknown app" warning when opening the installer. Click <strong style="color:#fff;">"More info"</strong> then <strong style="color:#fff;">"Run anyway"</strong>. This is normal for new apps.<br/><br/>Questions? <a href="mailto:suporte@ntzpcbooster.com">suporte@ntzpcbooster.com</a>',
  },

  es: {
    'nav.features': 'Recursos',
    'nav.pricing': 'Planes',
    'nav.faq': 'FAQ',
    'nav.buy': 'Comprar',

    'hero.badge': '50+ optimizaciones automaticas',
    'hero.title': 'Tu PC al <span class="text-accent">maximo</span><br/>rendimiento para juegos',
    'hero.sub': 'NTZ PCBooster aplica 50+ optimizaciones en Windows con un clic. Mas FPS, menos input lag, sin complicaciones tecnicas.',
    'hero.cta': 'Optimizar mi PC',
    'hero.cta2': 'Ver recursos',
    'hero.stat1': 'Optimizaciones',
    'hero.stat2': 'Para aplicar todo',
    'hero.stat3': 'Reversible',

    'feat.badge': 'RECURSOS',
    'feat.title': 'Todo lo que necesitas para<br/><span class="text-accent">maximizar</span> tu rendimiento',
    'feat.1.title': 'Game Boost',
    'feat.1.desc': '27 optimizaciones enfocadas en juegos: GPU al maximo, Nagle desactivado, Game Mode optimizado, HPET deshabilitado y mucho mas.',
    'feat.2.title': 'Limpieza Inteligente',
    'feat.2.desc': 'Elimina bloatware, limpia caches del sistema, shaders y navegadores. Desactiva telemetria y servicios innecesarios.',
    'feat.3.title': 'Tweaks de Sistema',
    'feat.3.desc': 'Menu de contexto clasico, iconos de bandeja, efectos visuales optimizados, Bing removido de la busqueda. Todo reversible.',
    'feat.4.title': 'Seguro y Reversible',
    'feat.4.desc': 'Cada optimizacion se puede deshacer individualmente. Nada es permanente — tienes control total de tu sistema.',
    'feat.5.title': 'Bloatware Selectivo',
    'feat.5.desc': 'Elige exactamente cuales apps preinstaladas eliminar. Xbox, Cortana, OneDrive — tu decides que se queda y que se va.',
    'feat.6.title': 'Vinculado al Hardware',
    'feat.6.desc': 'Licencia vinculada a tu placa madre. Reinstalaste Windows? Activa de nuevo con la misma clave, sin burocracia.',

    'how.badge': 'COMO FUNCIONA',
    'how.title': 'Tres pasos. <span class="text-accent">Sin complicaciones.</span>',
    'how.1.title': 'Compra tu licencia',
    'how.1.desc': 'Elige el plan y recibe tu clave por email en segundos.',
    'how.2.title': 'Activa NTZ PCBooster',
    'how.2.desc': 'Descarga la app, ingresa la clave y vinculala a tu PC.',
    'how.3.title': 'Optimiza con 1 clic',
    'how.3.desc': 'Aplica todas las optimizaciones de una vez o elige individualmente.',

    'price.badge': 'PLANES',
    'price.title': 'Una inversion que <span class="text-accent">se paga sola</span>',
    'price.sub': 'Clave entregada por email inmediatamente despues del pago',
    'price.couponLabel': 'TIENES CUPON?',
    'price.couponBtn': 'Aplicar',
    'price.couponPlaceholder': 'CODIGO',
    'price.redeemTitle': '<i class="ph ph-gift"></i> Canje gratuito',
    'price.redeemDesc': 'Cupon 100% aplicado! Ingresa tu email para recibir la clave:',
    'price.redeemBtn': 'Canjear gratis',
    'price.monthly': 'Mensual',
    'price.monthlyDesc': 'Para quien quiere probar',
    'price.monthlyPeriod': '/mes',
    'price.annual': 'Anual',
    'price.annualDesc': 'Mejor relacion calidad-precio',
    'price.annualPeriod': '/ano',
    'price.popular': 'MAS POPULAR',
    'price.feat1': '53 optimizaciones',
    'price.feat2': 'Actualizaciones incluidas',
    'price.feat3m': 'Soporte por email',
    'price.feat3a': 'Soporte prioritario',
    'price.feat4m': 'Cancela cuando quieras',
    'price.feat4a': '50% de ahorro',
    'price.feat5': 'Reinstala cuantas veces quieras',
    'price.btnMonthly': 'Suscribir mensual',
    'price.btnAnnual': 'Suscribir anual',
    'price.guarantee': 'Garantia de 14 dias. No te gusto? Devolucion total, sin preguntas.',

    'faq.badge': 'FAQ',
    'faq.title': 'Preguntas frecuentes',
    'faq.q1': 'NTZ PCBooster es seguro? Va a danar mi PC?',
    'faq.a1': '100% seguro. Todas las optimizaciones son reversibles — cada ajuste se puede deshacer individualmente con un clic. Ningun cambio es permanente.',
    'faq.q2': 'Funciona en Windows 10 y 11?',
    'faq.a2': 'Si, funciona en ambos. Algunas optimizaciones especificas indican cuando son exclusivas de una version.',
    'faq.q3': 'Puedo usarlo en mas de un PC?',
    'faq.a3': 'Cada licencia esta vinculada a una placa madre. Si cambias de PC, contacta al soporte para transferir tu licencia gratis.',
    'faq.q4': 'Cuantos FPS voy a ganar?',
    'faq.a4': 'La ganancia varia segun tu hardware y juegos. Las optimizaciones eliminan cuellos de botella de Windows que consumen recursos innecesariamente, liberando mas rendimiento para los juegos.',
    'faq.q5': 'Como recibo mi clave?',
    'faq.a5': 'Inmediatamente despues del pago, tu clave se envia al email usado en la compra. Solo abre NTZ PCBooster e ingresa la clave.',
    'faq.q6': 'Y si reinstalo Windows?',
    'faq.a6': 'Sin problema. Descarga NTZ PCBooster de nuevo y usa la misma clave. Como la licencia esta vinculada a tu placa madre, se activa automaticamente.',
    'faq.q7': 'Cual es la politica de reembolso?',
    'faq.a7': 'Tienes 14 dias para pedir un reembolso total, sin preguntas. Solo envia un email a suporte@pcboost.com.br.',
    'faq.q8': 'Necesito conocimiento tecnico?',
    'faq.a8': 'No. NTZ PCBooster esta hecho para ser simple. Un clic aplica todas las optimizaciones. Tambien puedes elegir individualmente cuales ajustes quieres hacer.',

    'cta.title': 'Listo para <span class="text-accent">potenciar</span> tu PC?',
    'cta.sub': 'Unete a quienes ya optimizaron su Windows con NTZ PCBooster.',
    'cta.btn': 'Comenzar ahora',

    'footer.copy': '&copy; 2026 NTZ PCBooster. Todos los derechos reservados.',

    'success.title': 'Compra confirmada!',
    'success.sub': 'Tu clave de activacion fue enviada al email usado en la compra.<br/>Revisa tu bandeja de entrada (y el spam).',
    'success.stepsTitle': 'PROXIMOS PASOS',
    'success.step1': 'Descarga NTZ PCBooster haciendo clic en el boton de abajo',
    'success.step2': 'Abre el instalador y sigue las instrucciones de instalacion',
    'success.step3': 'En la app, haz clic en "Activar licencia" y pega la clave que recibiste por email',
    'success.step4': 'Disfruta tu PC optimizado!',
    'success.download': 'Descargar NTZ PCBooster',
    'success.note': '<i class="ph ph-info"></i> Compatible con Windows 10 y 11. Tu licencia esta vinculada a tu placa madre — reinstala cuantas veces quieras.<br/><br/><i class="ph ph-shield-check"></i> <strong style="color:var(--text-dim);">Nota:</strong> Windows puede mostrar un aviso de "app desconocida" al abrir el instalador. Haz clic en <strong style="color:#fff;">"Mas informacion"</strong> y luego <strong style="color:#fff;">"Ejecutar de todas formas"</strong>. Esto es normal para apps nuevas.<br/><br/>Dudas? <a href="mailto:suporte@ntzpcbooster.com">suporte@ntzpcbooster.com</a>',
  },
};

// ─── Language detection & persistence ───
function detectLang() {
  const stored = localStorage.getItem('pcboost_lang');
  if (stored && LANDING_LOCALES[stored]) return stored;

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt';
}

let currentLang = detectLang();

function setLang(lang) {
  if (!LANDING_LOCALES[lang]) return;
  currentLang = lang;
  localStorage.setItem('pcboost_lang', lang);
  applyTranslations();
  updateLangSwitcher();
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
}

function t(key) {
  return LANDING_LOCALES[currentLang]?.[key] || LANDING_LOCALES.pt[key] || key;
}

// ─── Apply translations to DOM ───
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

// ─── Language switcher UI ───
function createLangSwitcher() {
  const navLinks = document.querySelector('.nav__links');
  if (!navLinks) return;

  const switcher = document.createElement('div');
  switcher.className = 'lang-switcher';
  switcher.innerHTML = `
    <button class="lang-switcher__btn" data-lang="pt">PT</button>
    <button class="lang-switcher__btn" data-lang="en">EN</button>
    <button class="lang-switcher__btn" data-lang="es">ES</button>
  `;

  // Insert before the buy button
  const buyBtn = navLinks.querySelector('.btn--accent');
  if (buyBtn) {
    navLinks.insertBefore(switcher, buyBtn);
  } else {
    navLinks.appendChild(switcher);
  }

  switcher.querySelectorAll('.lang-switcher__btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  updateLangSwitcher();
}

function updateLangSwitcher() {
  document.querySelectorAll('.lang-switcher__btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.lang === currentLang);
  });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  createLangSwitcher();
  applyTranslations();
});
