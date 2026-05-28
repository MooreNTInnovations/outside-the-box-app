drop policy if exists "reports update governance" on public.reports;

create policy "reports update governance"
on public.reports for update
to authenticated
using (
  public.is_admin()
  or public.current_user_role() = 'moderator'
)
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'moderator'
    and status in ('open', 'reviewed')
  )
);

drop policy if exists "admin actions read governance" on public.admin_actions;

create policy "admin actions read governance"
on public.admin_actions for select
to authenticated
using (public.is_admin());

drop policy if exists "admin actions insert governance" on public.admin_actions;

create policy "admin actions insert governance"
on public.admin_actions for insert
to authenticated
with check (actor_id = auth.uid() and public.is_moderator_or_admin());
