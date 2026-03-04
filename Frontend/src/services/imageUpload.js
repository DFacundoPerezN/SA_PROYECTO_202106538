import axios from 'axios'

// Configuración de Azure Blob Storage
const AZURE_STORAGE_ACCOUNT = 'tu-storage-account'
const AZURE_CONTAINER = 'delivery-images'
const AZURE_SAS_TOKEN = 'tu-sas-token' // Token de acceso compartido

// export const imageUploadService = {

//   // Comprimir imagen antes de subir
//   compressImage: (file, maxWidth = 1200, quality = 0.8) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader()
//       reader.readAsDataURL(file)
      
//       reader.onload = (event) => {
//         const img = new Image()
//         img.src = event.target.result
        
//         img.onload = () => {
//           const canvas = document.createElement('canvas')
//           let width = img.width
//           let height = img.height
          
//           // Redimensionar si es necesario
//           if (width > maxWidth) {
//             height = (height * maxWidth) / width
//             width = maxWidth
//           }
          
//           canvas.width = width
//           canvas.height = height
          
//           const ctx = canvas.getContext('2d')
//           ctx.drawImage(img, 0, 0, width, height)
          
//           // Convertir a blob
//           canvas.toBlob(
//             (blob) => {
//               resolve(blob)
//             },
//             'image/jpeg',
//             quality
//           )
//         }
        
//         img.onerror = reject
//       }
      
//       reader.onerror = reject
//     })
//   },

//   // Subir a Azure Blob Storage
//   uploadToAzure: async (file) => {
//     try {
//       // Comprimir imagen
//       const compressedBlob = await imageUploadService.compressImage(file)
      
//       // Generar nombre único
//       const timestamp = Date.now()
//       const randomString = Math.random().toString(36).substring(7)
//       const fileName = `delivery-${timestamp}-${randomString}.jpg`
      
//       // URL de Azure Blob Storage
//       const blobUrl = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${fileName}?${AZURE_SAS_TOKEN}`
      
//       // Subir archivo
//       await axios.put(blobUrl, compressedBlob, {
//         headers: {
//           'x-ms-blob-type': 'BlockBlob',
//           'Content-Type': 'image/jpeg',
//         },
//       })
      
//       // Retornar URL pública (sin SAS token para mayor seguridad)
//       return `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${fileName}`
      
//     } catch (error) {
//       console.error('Error uploading to Azure:', error)
//       throw new Error('Error al subir la imagen')
//     }
//   },

//   // Alternativa: Subir como base64 directamente al backend
//   uploadAsBase64: async (file) => {
//     try {
//       const compressedBlob = await imageUploadService.compressImage(file)
//       const base64 = await imageUploadService.fileToBase64(compressedBlob)
//       return base64
//     } catch (error) {
//       console.error('Error converting to base64:', error)
//       throw new Error('Error al procesar la imagen')
//     }
//   },

//   // Validar archivo
//   validateImage: (file) => {
//     // Validar tipo
//     const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
//     if (!validTypes.includes(file.type)) {
//       throw new Error('Solo se permiten imágenes (JPG, PNG, WEBP)')
//     }
    
//     // Validar tamaño (máximo 5MB)
//     const maxSize = 5 * 1024 * 1024 // 5MB
//     if (file.size > maxSize) {
//       throw new Error('La imagen no puede superar 5MB')
//     }
    
//     return true
//   }
// }
// Agregar al final del archivo

export const imageUploadService = {
  // Convertir archivo a base64
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  },
    // Comprimir imagen antes de subir
  compressImage: (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Redimensionar si es necesario
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              resolve(blob)
            },
            'image/jpeg',
            quality
          )
        }
        
        img.onerror = reject
      }
      
      reader.onerror = reject
    })
  },

    validateImage: (file) => {
    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      throw new Error('Solo se permiten imágenes (JPG, PNG, WEBP)')
    }
    
    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('La imagen no puede superar 5MB')
    }
    
    return true
  },

  // Subir a ImgBB (gratis)
  uploadToImgBB: async (file) => {
    try {
      const API_KEY = 'a6f9610ed18df9e4c270b1823bc61d1f' // Obtén en https://api.imgbb.com/
      
      const compressedBlob = await imageUploadService.compressImage(file)
      const base64 = await imageUploadService.fileToBase64(compressedBlob)
      const base64Data = base64.split(',')[1] // Remover prefijo data:image/...
      
      const formData = new FormData()
      formData.append('image', base64Data)
      
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${API_KEY}`,
        formData
      )
      
      return response.data.data.url
      
    } catch (error) {
      console.error('Error uploading to ImgBB:', error)
      throw new Error('Error al subir la imagen')
    }
  }
}