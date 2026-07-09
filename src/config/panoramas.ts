import type { PanoramaNode } from '@/core/types';

/**
 * The tour graph.
 *
 * Today this is a static array bundled with the app; it is consumed exclusively
 * through {@link PanoramaRepository}, so swapping it for a `fetch()` against a
 * CMS later touches exactly one file and nothing else.
 *
 * To add a panorama: append a node with a unique `id` and an image under
 * `public/assets/panoramas/`. To connect two panoramas, add a {@link PanoramaLink}
 * to `links` pointing at the other node's `id`.
 */
export const panoramas: PanoramaNode[] = [
  {
    id: 'Коридор_201_220',
    title: 'Коридор',
    image: '/assets/panoramas/Коридор_201_220.jpg',
    initialYaw: 265,
    initialPitch: -5,
    links: [
      { targetId: 'Коридор_202', yaw: 265, pitch: -18, label: 'Дальше по коридору' },
      { targetId: '220_экран', yaw: 170, pitch: -18, label: 'В аудиторию 220' },
      { targetId: '201_вход', yaw: 13, pitch: -19, label: 'В аудиторию 201' }
    ],
  },
  {
    id: 'Коридор_202',
    title: 'Коридор',
    image: '/assets/panoramas/Коридор_202.jpg',
    initialYaw: 180,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_201_220', yaw: -5, pitch: -18, label: 'Дальше по коридору' },
      { targetId: 'Коридор_203', yaw: 173, pitch: -16, label: 'Дальше по коридору' }
    ],
  },
  {
    id: 'Коридор_203',
    title: 'Коридор',
    image: '/assets/panoramas/Коридор_203_220А.jpg',
    initialYaw: 195,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_202', yaw: 12, pitch: -18, label: 'Дальше по коридору' },
      { targetId: 'Коридор_219', yaw: 190, pitch: -18, label: 'Дальше по коридору' }
    ],
  },
  {
    id: 'Коридор_219',
    title: 'Коридор',
    image: '/assets/panoramas/Коридор_219.jpg',
    initialYaw: 215,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_203', yaw: 30, pitch: -23, label: 'Дальше по коридору' },
      { targetId: 'Коридор_перед_лестницей', yaw: 215, pitch: -15, label: 'Дальше по коридору' },
      { targetId: '219_вход', yaw: 120, pitch: -23, label: 'В аудиторию 219' }
    ],
  },
  {
    id: 'Коридор_перед_лестницей',
    title: 'Коридор',
    image: '/assets/panoramas/Коридор_перед_лестницой.jpg',
    initialYaw: 250,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_219', yaw: 45, pitch: -16, label: 'Дальше по коридору' },
      { targetId: 'Стенд', yaw: 253, pitch: -10, label: 'Дальше по коридору' }
    ],
  },
  {
    id: 'Стенд',
    title: 'Коридор',
    image: '/assets/panoramas/Стенд.jpg',
    initialYaw: 220,
    initialPitch: -10,
    links: [
      { targetId: 'Коридор_перед_лестницей', yaw: 65, pitch: -25, label: 'Дальше по коридору' },
      { targetId: 'Сибкодинг_вход', yaw: -50, pitch: -15, label: 'Дальше по коридору' },
    ],
  },
  {
    id: '220_экран',
    title: 'Аудитория 220',
    image: '/assets/panoramas/220_экран.jpg',
    initialYaw: 200,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_201_220', yaw: -107, pitch: -15, label: 'В коридор' },
      { targetId: '220_стенд', yaw: 110, pitch: -15, label: 'В коридор' },
      { targetId: '220_сзади_слева', yaw: 180, pitch: -10, label: 'В коридор' },
      { targetId: '220_сзади_справа', yaw: 205, pitch: -10, label: 'В коридор' }
    ],
    infoSpots: [
      { yaw: 30, pitch: 0, video: '/assets/videos/4_VR_AR_220.mp4', label: 'Аудитория 220' }
    ],
  },
  {
    id: '220_сзади_слева',
    title: 'Аудитория 220',
    image: '/assets/panoramas/220_сзади_слева.jpg',
    initialYaw: 180,
    initialPitch: 0,
    links: [
      { targetId: '220_экран', yaw: 170, pitch: -12, label: 'В коридор' },
      { targetId: '220_сзади_справа', yaw: 90, pitch: -30, label: 'В коридор' }
    ],
  },
  {
    id: '220_сзади_справа',
    title: 'Аудитория 220',
    image: '/assets/panoramas/220_сзади_справа.jpg',
    initialYaw: 200,
    initialPitch: 0,
    links: [
      { targetId: '220_экран', yaw: 150, pitch: -10, label: 'В коридор' },
      { targetId: '220_сзади_слева', yaw: 230, pitch: -25, label: 'В коридор' }
    ],
  },
  {
    id: '220_стенд',
    title: 'Аудитория 220',
    image: '/assets/panoramas/220_стенд.jpg',
    initialYaw: 200,
    initialPitch: 0,
    links: [
      { targetId: '220_экран', yaw: -100, pitch: -40, label: 'В коридор' }
    ],
  },
  {
    id: '201_вход',
    title: 'Аудитория 201',
    image: '/assets/panoramas/201_вход.jpg',
    initialYaw: 200,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_201_220', yaw: 5, pitch: -35, label: 'В коридор' },
      { targetId: '201_пр_стол', yaw: 185, pitch: -10, label: 'В коридор' },
      { targetId: '201_экран', yaw: 185, pitch: -30, label: 'В коридор' }
    ],
  },
  {
    id: '201_пр_стол',
    title: 'Аудитория 201',
    image: '/assets/panoramas/201_пр_стол.jpg',
    initialYaw: 80,
    initialPitch: 0,
    links: [
      { targetId: '201_вход', yaw: 125, pitch: -5, label: 'В коридор' },
      { targetId: '201_экран', yaw: 125, pitch: -40, label: 'В коридор' }
    ],
  },
  {
    id: '201_экран',
    title: 'Аудитория 201',
    image: '/assets/panoramas/201_экран.jpg',
    initialYaw: 55,
    initialPitch: -10,
    links: [
      { targetId: '201_вход', yaw: 140, pitch: -5, label: 'В коридор' },
      { targetId: '201_пр_стол', yaw: -40, pitch: -25, label: 'В коридор' },
      { targetId: '201_центр', yaw: 55, pitch: -25, label: 'В коридор' },
      { targetId: '201_задние_ряды', yaw: 55, pitch: -13, label: 'В коридор' }
    ],
    infoSpots: [
      { yaw: 220, pitch: 0, video: '/assets/videos/3_KIBER_POLIGON_201.mp4', label: 'Аудитория 201' }
    ],
  },
  {
    id: '201_центр',
    title: 'Аудитория 201',
    image: '/assets/panoramas/201_центр.jpg',
    initialYaw: -130,
    initialPitch: -5,
    links: [
      { targetId: '201_экран', yaw: -135, pitch: -20, label: 'В коридор' },
      { targetId: '201_задние_ряды', yaw: 50, pitch: -25, label: 'В коридор' }
      
    ],
  },
  {
    id: '201_задние_ряды',
    title: 'Аудитория 201',
    image: '/assets/panoramas/201_задние_ряды.jpg',
    initialYaw: -190,
    initialPitch: -10,
    links: [
      { targetId: '201_центр', yaw: -190, pitch: -30, label: 'В коридор' },
      { targetId: '201_экран', yaw: -190, pitch: -12, label: 'В коридор' }
    ],
  },
  {
    id: '219_вход',
    title: 'Аудитория 219',
    image: '/assets/panoramas/219_вход.jpg',
    initialYaw: -30,
    initialPitch: 0,
    links: [
      { targetId: 'Коридор_219', yaw: 75, pitch: -10, label: 'В коридор' },
      { targetId: '219_экран', yaw: -20, pitch: -10, label: 'В коридор' }
    ],
  },
  {
    id: '219_экран',
    title: 'Аудитория 219',
    image: '/assets/panoramas/219_экран.jpg',
    initialYaw: -100,
    initialPitch: 0,
    links: [
      { targetId: '219_вход', yaw: 75, pitch: -10, label: 'В коридор' },],
    infoSpots: [
      { yaw: -120, pitch: 0, video: '/assets/videos/2_VID_GIBRID_219.mp4', label: 'Аудитория 219' }
    ],
  },
  {
    id: 'Сибкодинг_вход',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_вход.jpg',
    initialYaw: 20,
    initialPitch: -5,
    links: [
      { targetId: 'Стенд', yaw: 125, pitch: -10, label: 'В коридор' },
      { targetId: 'Сибкодинг_пк', yaw: 50, pitch: -10, label: 'В коридор' },
      { targetId: 'Сибкодинг_пк_2', yaw: -28, pitch: -10, label: 'В коридор' },
      { targetId: 'Сибкодинг_коридор', yaw: -115, pitch: -20, label: 'В коридор' }
    ],
  },
  {
    id: 'Сибкодинг_пк',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_пк.jpg',
    initialYaw: -150,
    initialPitch: -10,
    links: [
      { targetId: 'Сибкодинг_вход', yaw: 125, pitch: -10, label: 'В коридор' },
    ],
  },
  {
    id: 'Сибкодинг_пк_2',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_пк_2.jpg',
    initialYaw: 40,
    initialPitch: -10,
    links: [
      { targetId: 'Сибкодинг_вход', yaw: 90, pitch: -10, label: 'В коридор' },
    ],
  },
  {
    id: 'Сибкодинг_коридор',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_коридор.jpg',
    initialYaw: -110,
    initialPitch: -10,
    links: [
      { targetId: 'Сибкодинг_вход', yaw: 25, pitch: -20, label: 'В коридор' },
      { targetId: 'Сибкодинг_доска', yaw: -90, pitch: -20, label: 'В коридор' },
      { targetId: 'Сибкодинг_награды', yaw: -150, pitch: -20, label: 'В коридор' },
      { targetId: 'Сибкодинг_стол', yaw: -180, pitch: -20, label: 'В коридор' },
    ],
    infoSpots: [
      { yaw: 200, pitch: 0, video: '/assets/videos/5_SIBKOD_1.mp4', label: 'Сибкодинг' }
    ],
  },
  {
    id: 'Сибкодинг_доска',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_доска.jpg',
    initialYaw: 120,
    initialPitch: -10,
    links: [
      { targetId: 'Сибкодинг_коридор', yaw: 20, pitch: -20, label: 'В коридор' },
    ],
  },
  {
    id: 'Сибкодинг_награды',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_награды.jpg',
    initialYaw: 120,
    initialPitch: -10,
    links: [
      { targetId: 'Сибкодинг_коридор', yaw: -5, pitch: -10, label: 'В коридор' },
    ],
  },
  {
    id: 'Сибкодинг_стол',
    title: 'Сибкодинг',
    image: '/assets/panoramas/Сибкодинг_стол.jpg',
    initialYaw: 60,
    initialPitch: -25,
    links: [
      { targetId: 'Сибкодинг_коридор', yaw: 36, pitch: -20, label: 'В коридор' },
    ],
  },
];

/** Id of the panorama shown on first load. */
export const entryPanoramaId = 'Сибкодинг_коридор'
