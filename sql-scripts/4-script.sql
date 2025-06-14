create function convert_to_grams(unit text, amount numeric) returns numeric
    language plpgsql
as
$$
BEGIN
  CASE UPPER(unit)
    WHEN 'GRAMOS' THEN RETURN amount;  
    WHEN 'KILOGRAMOS' THEN RETURN amount * 1000;
    WHEN 'ONZAS' THEN RETURN amount * 28.3495;
    WHEN 'LIBRAS' THEN RETURN amount * 453.592;
    WHEN 'TONELADAS' THEN RETURN amount * 1000000;
    ELSE
      RAISE EXCEPTION 'Unit not valid: %', unit;
  END CASE;
END;
$$;

alter function convert_to_grams(text, numeric) owner to "admin-cropco";

