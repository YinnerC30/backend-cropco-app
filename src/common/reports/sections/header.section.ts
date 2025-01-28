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
  text: DateFormatter.getDDMMMMYYYY(new Date()),
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
}

export const headerSection = (options: HeaderOptions): Content => {
  const { title, subTitle, showLogo = true, showDate = true } = options;

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

  const headerTitle: Content = title
    ? {
        stack: [
          {
            width: 100,
            text: title,
            alignment: 'center',
            margin: [0, 15, 0, 0],
            style: {
              fontSize: 25,
              bold: true,
              margin: [0, 0, 0, 5],
              color: '#606C38', // Color verde
              alignment: 'center',
            },
          },
          headerSubTitle,
        ],
      }
    : null;

  return [headerTitle, headerDate, lineSeparator];
};
