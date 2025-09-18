const bcrypt = require("bcryptjs")

// Contraseña a hashear
const password = "admin123"

// Generar hash
bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    console.log("Contraseña original:", password)
    console.log("Hash bcrypt:", hash)

    // Verificar que el hash funciona
    bcrypt.compare(password, hash, (err, isMatch) => {
      console.log("Verificación correcta:", isMatch)
    })
  })
})
