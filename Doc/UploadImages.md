## Almacenamiento de Imagenes

### Subida en Bucket en la Nube

Se escogió utilizar un servidor de archivos en la nube para subir las imagenes, este sistema uno que mediante las credenciales correctas permite subir los archivos.

## Servicio: ImgBB

Se decidio utilizar el servidor de ImgBB debido a su disponibilidad en zonas de latinoamerica y documentación en español.
Principalemente se eligio gracias a que es una opción *100%* gratuita mientras no se consuma el recurso de 32 MB que dan. 

https://api.imgbb.com/

### Flujo Subida desde frontend 

El proceso de frontend conssite en que al decidir marcar un pedido como entregado el repartidor pulsara un boton el cual abrira una pestaña para subida de imagenes.

Esto funciona con el navegador cargando la informacion desde el fichero al codigo. Dónde se realiza un proceso de compresion por el cual las diferentes capas de la imaegen se compactan en una sola.

Desúes se pasa al proceso de codificación a base64, este proceso es la princiapal manera de subir archivos a la nube, fundamental para facilitar el proceso.

Después de eso se hace el uso de la api de ImgBB para subir y guradar la imagen. Que devuelve una respuesta ocn la información incluida el link de accesos a la imagen.

En caso de fallas el sistema detiene el proceso de aceptación.

Flujo de subida de imagen:
```Mermaid
graph TD

    A[Repartidor presiona boton para entregar] --> B[despliega espacio par asubir archivo]

    B --> C[Repartidor selecciona imagen]

    C --> D[Sistema busca el archivo y lo lee]

    D --> E[Compacta el archivo]

    E --> F[Vista preeliminar del archivo a subir]

    F --> |El repartidor confirma la subida| G[Se sube al bucket de  ImgBB]

    G --> |Subidaextidoa| H[Devuelve la url de la imagen]

    H --> I[Url es guardada en la base de datos de ordenes *ImagenOrden*]

```

### Ver imagenes

El usuario tendra la oportunidad de ver las imagens de las ordenes que estén en estado de "ENTREGADAS"
