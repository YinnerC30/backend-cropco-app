import { calculateGrowthHarvest } from './calculateGrowthHarvest';

describe('calculateGrowthHarvest', () => {
  it('should return no-valid status when both years have zero totals', () => {
    const data = {
      last_year: {
        year: 2023,
        data: [{ month: 'January', amount: 0, value_pay: 0 }],
      },
      previous_year: {
        year: 2022,
        data: [{ month: 'January', amount: 0, value_pay: 0 }],
      },
    };

    expect(calculateGrowthHarvest(data)).toEqual({
      growth_value: 0,
      difference: 0,
      status: 'no-valid',
      total_current: 0,
      total_previous: 0,
    });
  });

  it('should return no-valid status when previous year is zero', () => {
    const data = {
      last_year: {
        year: 2023,
        data: [{ month: 'January', amount: 100, value_pay: 0 }],
      },
      previous_year: {
        year: 2022,
        data: [{ month: 'January', amount: 0, value_pay: 0 }],
      },
    };

    expect(calculateGrowthHarvest(data)).toEqual({
      growth_value: 100,
      difference: 100,
      status: 'no-valid',
      total_current: 100,
      total_previous: 0,
    });
  });

  it('should return increment status when growth is positive', () => {
    const data = {
      last_year: {
        year: 2023,
        data: [{ month: 'January', amount: 200, value_pay: 0 }],
      },
      previous_year: {
        year: 2022,
        data: [{ month: 'January', amount: 100, value_pay: 0 }],
      },
    };

    expect(calculateGrowthHarvest(data)).toEqual({
      growth_value: 100,
      difference: 100,
      status: 'increment',
      total_current: 200,
      total_previous: 100,
    });
  });

  it('should return decrement status when growth is negative', () => {
    const data = {
      last_year: {
        year: 2023,
        data: [{ month: 'January', amount: 50, value_pay: 0 }],
      },
      previous_year: {
        year: 2022,
        data: [{ month: 'January', amount: 100, value_pay: 0 }],
      },
    };

    expect(calculateGrowthHarvest(data)).toEqual({
      growth_value: -50,
      difference: -50,
      status: 'decrement',
      total_current: 50,
      total_previous: 100,
    });
  });

  it('should return stable status when no growth', () => {
    const data = {
      last_year: {
        year: 2023,
        data: [{ month: 'January', amount: 100, value_pay: 0 }],
      },
      previous_year: {
        year: 2022,
        data: [{ month: 'January', amount: 100, value_pay: 0 }],
      },
    };

    expect(calculateGrowthHarvest(data)).toEqual({
      growth_value: 0,
      difference: 0,
      status: 'stable',
      total_current: 100,
      total_previous: 100,
    });
  });
});
