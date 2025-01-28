export function formatDate(fechaOriginal: string) {
  // Crear un objeto Date a partir de la fecha original
  const date = new Date(fechaOriginal+ 'T00:00:00');

  // Array con los nombres de los meses en español
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  // Obtener el día, mes y año
  const dia = date.getDate();
  const mes = months[date.getMonth()]; // Usamos el array de meses para obtener el nombre
  const anio = date.getFullYear();

  // Formatear la fecha en el formato deseado
  return `${dia} de ${mes} de ${anio}`;
}
