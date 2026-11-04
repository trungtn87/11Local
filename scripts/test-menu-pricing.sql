-- Execute on an isolated 11Local branch. Fixtures are rolled back inside a subtransaction.
DO $$
DECLARE pid uuid; rid uuid; old_content jsonb; proposed jsonb; value jsonb; n integer;
BEGIN
  BEGIN
    SELECT id INTO pid FROM api.public_places ORDER BY id LIMIT 1;
    IF pid IS NULL THEN RAISE EXCEPTION 'Needs one published place fixture'; END IF;
    old_content='{"title":"Giá cũ","photoIds":[],"groups":[{"name":"Vé","kind":"tickets","items":[{"name":"Vé vào cửa","description":"","priceType":"fixed","priceMin":10000,"priceMax":null,"unit":"người","available":true,"startDate":"","endDate":"","photoId":null}]}]}'::jsonb;
    proposed=jsonb_set(old_content,'{title}','"Giá mới"'::jsonb);
    INSERT INTO public.place_menus(place_id,content,published_at) VALUES (pid,old_content,now());
    INSERT INTO public.menu_revisions(place_id,source,base_version,content,status)
      VALUES (pid,'admin',1,proposed,'draft') RETURNING id INTO rid;
    SELECT content INTO value FROM public.place_menus WHERE place_id=pid;
    IF value<>old_content THEN RAISE EXCEPTION 'Draft replaced publication'; END IF;
    BEGIN
      INSERT INTO public.menu_revisions(place_id,source,base_version,content,status)
        VALUES (pid,'admin',1,proposed,'pending');
      RAISE EXCEPTION 'Concurrent open revision was allowed';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    UPDATE public.menu_revisions SET status='pending',submitted_at=now() WHERE id=rid;
    SELECT m.content INTO value FROM public.place_menus m JOIN api.public_places p ON p.id=m.place_id WHERE m.place_id=pid AND NOT m.hidden;
    IF value<>old_content THEN RAISE EXCEPTION 'Pending content leaked'; END IF;
    UPDATE public.menu_revisions SET status='needs_info',decision_note='Bổ sung giá' WHERE id=rid;
    SELECT content INTO value FROM public.place_menus WHERE place_id=pid;
    IF value<>old_content THEN RAISE EXCEPTION 'Needs-info replaced publication'; END IF;
    UPDATE public.menu_revisions SET status='pending',version=version+1 WHERE id=rid;
    UPDATE public.place_menus SET content=proposed,version=version+1,published_at=now() WHERE place_id=pid AND version=1;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Publication failed'; END IF;
    UPDATE public.menu_revisions SET status='approved' WHERE id=rid;
    UPDATE public.place_menus SET content=old_content WHERE place_id=pid AND version=1;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Stale publication overwrote data'; END IF;
    UPDATE public.place_menus SET hidden=true WHERE place_id=pid;
    SELECT count(*) INTO n FROM public.place_menus m JOIN api.public_places p ON p.id=m.place_id WHERE m.place_id=pid AND NOT m.hidden;
    IF n<>0 THEN RAISE EXCEPTION 'Hidden menu leaked'; END IF;
    IF has_table_privilege('local_public_reader','public.menu_revisions','SELECT') THEN RAISE EXCEPTION 'Reader can access drafts'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $$;
