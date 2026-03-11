"""add hindi translation columns

Revision ID: f8a1b2c3d4e5
Revises: 69088dac091e
Create Date: 2026-03-07 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a1b2c3d4e5'
down_revision: Union[str, None] = '69088dac091e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Module Hindi fields
    op.add_column('modules', sa.Column('hindi_description', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('hindi_objectives', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('hindi_applications', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('hindi_quiz_data', sa.Text(), nullable=True))

    # ModuleStep Hindi fields
    op.add_column('module_steps', sa.Column('hindi_title', sa.String(), nullable=True))
    op.add_column('module_steps', sa.Column('hindi_content', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('module_steps', 'hindi_content')
    op.drop_column('module_steps', 'hindi_title')
    op.drop_column('modules', 'hindi_quiz_data')
    op.drop_column('modules', 'hindi_applications')
    op.drop_column('modules', 'hindi_objectives')
    op.drop_column('modules', 'hindi_description')
