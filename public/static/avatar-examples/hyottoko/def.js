export default {
  name: 'hyottoko',
  default: {
    slot: {
      face: '/static/avatar-examples/hyottoko/base.png',
      eye: '/static/avatar-examples/hyottoko/eyes_default.png',
      mouth: '/static/avatar-examples/hyottoko/mouth_default.png',
    },
  },
  slotDefinitions: [
    {
      slot: 'face',
      items: [
        { url: '/static/avatar-examples/hyottoko/base.png', title: 'default' }
      ]
    },
    {
      slot: 'cheeks',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/hyottoko/cheeks_filled.png', title: 'filled' },
        { url: '/static/avatar-examples/hyottoko/cheeks_blush.png', title: 'blush' },
      ]
    },
    {
      slot: 'eye',
      items: [
        {
          url: '/static/avatar-examples/hyottoko/eyes_default.png',
          title: 'default',
          animation: {
            default: [
              { url: '/static/avatar-examples/hyottoko/eyes_default.png', duration: 5000 },
              { url: '/static/avatar-examples/hyottoko/eyes_default_2.png', duration: 500 },
            ],
          },
        },
        {
          url: '/static/avatar-examples/hyottoko/eyes_mini.png',
          title: 'mini',
          animation: {
            default: [
              { url: '/static/avatar-examples/hyottoko/eyes_mini.png', duration: 5000 },
              { url: '/static/avatar-examples/hyottoko/eyes_mini_2.png', duration: 500 },
            ],
          },
        },
      ]
    },
    {
      slot: 'mouth',
      items: [
        {
          url: '/static/avatar-examples/hyottoko/mouth_default.png',
          title: 'default',
          animation: {
            speaking: [
              { url: '/static/avatar-examples/hyottoko/mouth_default.png', duration: 100 },
              { url: '/static/avatar-examples/hyottoko/mouth_default_2.png', duration: 100 },
            ],
          },
        },
        {
          url: '/static/avatar-examples/hyottoko/mouth_open.png',
          title: 'open',
          animation: {
            speaking: [
              { url: '/static/avatar-examples/hyottoko/mouth_open.png', duration: 100 },
              { url: '/static/avatar-examples/hyottoko/mouth_open_2.png', duration: 100 },
            ],
          },
        },
        {
          url: '/static/avatar-examples/hyottoko/mouth_3.png',
          title: '3',
          animation: {
            speaking: [
              { url: '/static/avatar-examples/hyottoko/mouth_3.png', duration: 100 },
              { url: '/static/avatar-examples/hyottoko/mouth_3_2.png', duration: 100 },
            ],
          },
        },
      ]
    },
    {
      slot: 'eyebrows',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/hyottoko/eyebrow_angry.png', title: 'angry' },
      ]
    },
    {
      slot: 'cat1',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/hyottoko/cat_1.png', title: 'Cat 1' },
      ],
    },
    {
      slot: 'cat2',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/hyottoko/cat_2.png', title: 'Cat 2' },
      ],
    },
    {
      slot: 'cat3',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/hyottoko/cat_3.png', title: 'Cat 3' },
      ],
    },
  ],
}
