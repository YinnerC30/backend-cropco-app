import { Content } from 'pdfmake/interfaces';
import { DateFormatter } from 'src/common/helpers';
import { lineSeparator } from './line-separator';

// const logo: Content = {
//   image: 'src/assets/icon.png',
//   width: 50,
//   height: 50,
//   margin: [10, 10, 0, 0],
// };

const currentDate: Content = {
  text: DateFormatter.getSpanishDate(new Date().toISOString()),
  margin: [0, 0, 10, 0],
  width: 150,
  alignment: 'right',
  fontSize: 12,
};

interface HeaderOptions {
  title?: string;
  subTitle?: string;
  showLogo?: boolean;
  showDate?: boolean;
  icon?: string;
}

export const headerSection = (options: HeaderOptions): Content => {
  const {
    title,
    subTitle,
    showLogo = true,
    showDate = true,
    icon = '',
  } = options;

  // const headerLogo: Content = showLogo ? logo : null;
  const headerDate: Content = showDate ? currentDate : null;

  const headerSubTitle: Content = subTitle
    ? {
        text: subTitle,
        alignment: 'center',
        margin: [0, 2, 0, 0],
        style: {
          fontSize: 16,
        },
      }
    : null;

  const headerIcon: Content = !icon
    ? null
    : {
        svg: icon,
        margin: [0, 20, 0, 0],
        width: 40,
        height: 40,
      };

  const headerTitle: Content = title
    ? {
        columns: [
          {
            width: 'auto',
            text: title,

            margin: [40, 20, 0, 0],
            style: {
              fontSize: 25,
              bold: true,
              color: '#606C38', // Color verde
            },
          },
          headerIcon,
        ],
        columnGap: 10,
      }
    : null;

  return [headerTitle, headerSubTitle, headerDate, lineSeparator];
};
