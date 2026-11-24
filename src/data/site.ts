import { validateSiteConfig } from './site.schema';

const envUrl =
  (typeof process !== 'undefined' ? process.env.PUBLIC_SITE_URL : undefined) ??
  (import.meta as unknown as { env?: Record<string, string> }).env?.PUBLIC_SITE_URL;

export const site = {
  name: 'SIHYCA',
  legalName: 'SIHYCA',
  url: (envUrl || 'https://example.com').replace(/\/+$/, ''),
  tagline: 'Servicios y Suministros Industriales',
  description:
    'Soluciones industriales confiables en mantenimiento mecánico, eléctrico, climatización, obras civiles y suministro de rodamientos NTN 100% originales.',
  email: '' as string,
  phone: '' as string,
  phoneHref: '' as string,
  whatsappNumber: '' as string,
  whatsappText: 'Hola SIHYCA, quisiera solicitar una cotización.',
  address: '' as string,
  geo: null as { lat: number; lng: number } | null,
  mapUrl: '' as string,
  mapEmbed: '' as string,
  formEndpoint: '',
  // Captcha opcional (la verificación del token la hace el proveedor del formulario).
  captcha: { provider: '' as '' | 'turnstile', siteKey: '' },
  // Datos legales para /politica-de-privacidad/ y /aviso-legal/
  taxId: '' as string,
  privacyEmail: '' as string,
  socials: [
    {
      label: 'LinkedIn',
      href: '' as string,
      icon: 'linkedin',
    },
    {
      label: 'Instagram',
      href: '' as string,
      icon: 'instagram',
    },
    {
      label: 'Facebook',
      href: '' as string,
      icon: 'facebook',
    },
  ],
  nav: [
    { label: 'Inicio', href: '/' },
    { label: 'Contacto', href: '/contact-us/' },
    { label: 'Servicios', href: '/our-services/' },
    { label: 'Nosotros', href: '/our-story/' },
    { label: 'Rodamientos', href: '/rodamientos/' },
    { label: 'Blog', href: '/blog/' },
  ],
  services: [
    {
      slug: 'mecanica',
      icon: 'gear',
      title: 'Servicios Mecánicos y Metalmecánica',
      short:
        'Diseñamos, fabricamos y reparamos piezas y equipos industriales con precisión milimétrica.',
      description:
        'Diseñamos, fabricamos y reparamos piezas, componentes y equipos industriales con precisión milimétrica. Nuestro taller de metalmecánica responde a las exigencias de plantas que no pueden detener su operación.',
      capabilities: [
        'Fabricación y mecanizado de piezas a medida',
        'Reparación de bombas, reductores y equipos rotativos',
        'Montaje y alineación de maquinaria industrial',
        'Mantenimiento preventivo, predictivo y correctivo',
        'Soldadura especializada y estructuras metálicas',
      ],
      image: '/images/service-mechanical.svg',
    },
    {
      slug: 'electrica',
      icon: 'bolt',
      title: 'Servicios Eléctricos y Electromecánicos',
      short:
        'Garantizamos la potencia y continuidad de tu operación con sistemas eléctricos y tableros de alta ingeniería.',
      description:
        'Garantizamos la potencia y continuidad de tu operación con sistemas eléctricos, tableros de control y automatización de alta ingeniería. Atendemos desde el diagnóstico hasta la puesta en marcha.',
      capabilities: [
        'Fabricación y mantenimiento de tableros eléctricos',
        'Automatización y control industrial',
        'Instalaciones y mantenimiento de motores eléctricos',
        'Diagnóstico de fallas y termografía',
        'Puesta en marcha y pruebas de sistemas',
      ],
      image: '/images/service-electrical.svg',
    },
    {
      slug: 'climatizacion',
      icon: 'fan',
      title: 'Climatización y Refrigeración Industrial',
      short:
        'Instalamos y mantenemos el control térmico de tus espacios con sistemas de aire y ductería de gran escala.',
      description:
        'Instalamos y mantenemos el control térmico de tus espacios con sistemas de aire acondicionado, refrigeración y ductería de gran escala, diseñados para procesos productivos exigentes.',
      capabilities: [
        'Instalación de sistemas de climatización industrial',
        'Mantenimiento de chillers y unidades manejadoras',
        'Diseño y fabricación de ductería',
        'Refrigeración de cuartos fríos y cámaras',
        'Balanceo de aire y eficiencia energética',
      ],
      image: '/images/service-hvac.svg',
    },
    {
      slug: 'obras-civiles',
      icon: 'building',
      title: 'Obras Civiles, Mantenimiento y Suministros Generales',
      short:
        'Resolvemos desde la infraestructura y el transporte hasta el suministro clave para que tu planta nunca se detenga.',
      description:
        'Resolvemos desde la infraestructura y el transporte hasta el suministro clave para que tu planta nunca se detenga. Un solo proveedor para los frentes que tu operación necesita.',
      capabilities: [
        'Construcción y mantenimiento de obras civiles',
        'Adecuación de naves y espacios industriales',
        'Transporte y logística de componentes',
        'Suministros generales y ferrosos',
        'Importación y exportación de materiales',
      ],
      image: '/images/service-civil.svg',
    },
  ],
  whyUs: [
    {
      title: 'Capacidad Industrial 360°',
      text: 'Suministramos materiales, fabricamos piezas, ejecutamos obras civiles y realizamos mantenimientos mecánicos y eléctricos complejos con un solo proveedor de confianza.',
    },
    {
      title: 'Personal Altamente Calificado',
      text: 'Contamos con técnicos e ingenieros especializados para cada área de trabajo, enfocados en la mejora continua y el cumplimiento riguroso de normativas de seguridad industrial.',
    },
    {
      title: 'Garantía de Continuidad Operativa',
      text: 'Nuestras rutinas de mantenimiento predictivo, preventivo y correctivo están estructuradas para minimizar los tiempos de parada de planta y salvaguardar sus equipos.',
    },
    {
      title: 'Legalidad y Transparencia Absoluta',
      text: 'Operamos bajo estrictas políticas de honestidad, responsabilidad y rendición de cuentas, asegurando manejos transparentes y apego total al marco legal vigente.',
    },
  ],
  stats: [
    { value: '13+', label: 'Años impulsando la industria' },
    { value: '360°', label: 'Capacidad industrial integral' },
    { value: '100%', label: 'Rodamientos NTN originales' },
    { value: '4', label: 'Líneas de servicio integral' },
  ],
  brands: ['NTN', 'SKF', 'FAG', 'NSK', 'TIMKEN', 'INA'],
} as const;

validateSiteConfig(site);

export const whatsappLink = (message: string = site.whatsappText) =>
  site.whatsappNumber
    ? `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`
    : '';
