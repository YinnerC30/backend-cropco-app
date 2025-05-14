export class DateFormatter {
  static formatter = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });

  static getSpanishDate(originalDate: string) {
    // Crear un objeto Date a partir de la fecha original
    const date = new Date(originalDate.split('T')[0] + 'T00:00:00');

    // Array con los nombres de los meses en español
    const monthsES = [
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
    const day = date.getDate();
    const month = monthsES[date.getMonth()]; // Usamos el array de meses para obtener el nombre
    const year = date.getFullYear();

    // Formatear la fecha en el formato deseado
    return `${day} de ${month} de ${year}`;
  }
}
