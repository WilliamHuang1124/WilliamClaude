import sharp from 'sharp'

await sharp('public/favicon.svg').resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('Generated public/apple-touch-icon.png')
