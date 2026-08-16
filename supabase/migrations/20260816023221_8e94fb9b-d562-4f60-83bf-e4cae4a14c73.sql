UPDATE public.courts
SET name = 'BMP Futsal Ground',
    capacity = '7-a-side',
    description = 'Our full-size 7-a-side floodlit futsal ground.',
    sort_order = 1
WHERE sort_order = 1;

UPDATE public.courts SET is_active = false WHERE sort_order IN (2,3);
